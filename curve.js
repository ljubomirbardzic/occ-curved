import { useEffect } from "react";
import * as THREE from "three";

export function CurvedImageSlider() {
  useEffect(() => {
    if (window.curvedOnce) return;
    window.curvedOnce = true;

    const selector = '[aria-label="curved-image"]';
    const scene = [], renderer = [], options = [], camera = [],
      currentContainerHeight = [], previousContainerHeight = [], planes = [];

    const getWidth = (gap) => 1 + gap / 100;

    const getPlaneWidth = (el, camera) => {
      const vFov = (camera.fov * Math.PI) / 180;
      const height = 2 * Math.tan(vFov / 2) * camera.position.z;
      const aspect = el.clientWidth / el.clientHeight;
      const width = height * aspect;
      return el.clientWidth / width;
    };

    function removeSourceImages(el) {
      el.querySelectorAll("img").forEach((img) => img.remove());
    }

    const init = (e = "none") => {
      document.querySelectorAll(selector).forEach((el, index) => {
        if (e === "none") {
          currentContainerHeight[index] = previousContainerHeight[index] = el.clientHeight;
        } else {
          currentContainerHeight[index] = el.clientHeight;
          if (
            mobileHeightChage &&
            currentContainerHeight[index] === previousContainerHeight[index]
          ) return;
        }
        previousContainerHeight[index] = currentContainerHeight[index];

        options[index] = { speed: 30, gap: 10, curve: 12, direction: -1 };

        const images = [];
        el.querySelectorAll("img").forEach((img) => {
          images.push(img.getAttribute("src"));
        });
        removeSourceImages(el);

        scene[index] = new THREE.Scene();
        camera[index] = new THREE.PerspectiveCamera(
          75,
          el.clientWidth / el.clientHeight,
          0.1,
          20
        );
        camera[index].position.z = 1.75;

        renderer[index] = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer[index].setSize(el.clientWidth, el.clientHeight);
        renderer[index].setPixelRatio(window.devicePixelRatio);

        const previousCanvas = el.querySelector("canvas");
        if (previousCanvas) el.removeChild(previousCanvas);
        el.appendChild(renderer[index].domElement);

        const geometry = new THREE.PlaneGeometry(1.55, 1, 20, 20);
        const planeSpace = getPlaneWidth(el, camera[index]) * getWidth(options[index].gap);
        planes[index] = [];

        let loadedTextures = 0;
        const totalTextures = images.length;

        images.forEach((image, i) => {
          const loader = new THREE.TextureLoader();
          loader.load(image, (texture) => {
            const material = new THREE.ShaderMaterial({
              uniforms: {
                tex: { value: texture },
                curve: { value: options[index].curve },
              },
              vertexShader: `
                uniform float curve;
                varying vec2 vertexUV;
                void main() {
                  vertexUV = uv;
                  vec3 newPosition = position;
                  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                  float x = worldPosition.x;
                  float bendFactor = curve / 100.0;
                  newPosition.z -= pow(x, 2.0) * bendFactor * -0.5;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
              `,
              fragmentShader: `
                uniform sampler2D tex;
                varying vec2 vertexUV;
                void main() {
                  gl_FragColor = texture2D(tex, vertexUV);
                }
              `
            });

            planes[index][i] = new THREE.Mesh(geometry, material);

            const columns = 3;
            const rows = Math.ceil(totalTextures / columns);
            const planeWidth = 1.5;
            const planeHeight = 1;
            const spacing = planeWidth * getWidth(options[index].gap);
            const col = i % columns;
            const row = Math.floor(i / columns);
            const offsetX = (columns - 1) / 2;
            const offsetY = (rows - 1) / 2;

            planes[index][i].position.x = (col - offsetX) * spacing;
            planes[index][i].position.y = -(row - offsetY) * (planeHeight * getWidth(options[index].gap));

            scene[index].add(planes[index][i]);

            loadedTextures++;
            if (loadedTextures === totalTextures) {
              renderer[index].render(scene[index], camera[index]);
            }
          });
        });
      });
    };

    function handleResize(el, index) {
      const width = el.clientWidth;
      const height = el.clientHeight;
      renderer[index].setSize(width, height);
      camera[index].aspect = width / height;
      camera[index].updateProjectionMatrix();
      renderer[index].render(scene[index], camera[index]);
    }

    let currentWidth,
      previousWidth = window.innerWidth,
      mobileHeightChage = false;

    const onResize = () => {
      const newWidth = window.innerWidth;
      if (newWidth === previousWidth) return;
      currentWidth = newWidth;
      mobileHeightChage = newWidth < 768;
      init("resize");
      previousWidth = newWidth;
    };

    init();

    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        document.querySelectorAll(selector).forEach((el, index) => {
          handleResize(el, index);
        });
      }, 100);
    });

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null; // since the canvas is managed manually
}
