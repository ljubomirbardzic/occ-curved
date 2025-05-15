import * as THREE from "three";
  
    if (!window.curvedOnce) {
      window.curvedOnce = true;
      let selector = '[aria-label="curved-image"]',
        scene = [],
        renderer = [],
        options = [],
        camera = [],
        currentContainerHeight = [],
        previousContainerHeight = [],
        planes = [];
      addEventListener("DOMContentLoaded", function () {
        function getWidth(gap) {
          return 1 + gap / 100;
        }
        function getPlaneWidth(el, camera) {
          let vFov = (camera.fov * Math.PI) / 180,
            height = 2 * Math.tan(vFov / 2) * camera.position.z,
            aspect = el.clientWidth / el.clientHeight,
            width = height * aspect;
          return el.clientWidth / width;
        }
        function init(e = "none") {
          Array.from(document.querySelectorAll(selector)).forEach(function (
            el,
            index
          ) {
            if (e == "none") {
              currentContainerHeight[index] = previousContainerHeight[
                index
              ] = el.clientHeight;
            } else {
              currentContainerHeight[index] = el.clientHeight;
              if (
                mobileHeightChage &&
                currentContainerHeight[index] ==
                  previousContainerHeight[index]
              )
                return;
            }
            previousContainerHeight[index] = currentContainerHeight[index];
  
            options[index] = {
              speed: 30,
              gap: 10,
              curve: 12,
              direction: -1,
            };
  
            let images = [];
  
            el.querySelectorAll("img").forEach(function (img) {
              images.push(img.getAttribute("src"));
            });
  
            scene[index] = new THREE.Scene();
            camera[index] = new THREE.PerspectiveCamera(
              75,
              el.clientWidth / el.clientHeight,
              0.1,
              20
            );
            camera[index].position.z = 2;
  
            renderer[index] = new THREE.WebGLRenderer({
              alpha: true,
              antialias: true,
            });
            renderer[index].setSize(el.clientWidth, el.clientHeight);
            renderer[index].setPixelRatio(window.devicePixelRatio);
  
            let previousCanvas = el.querySelector("canvas");
            if (previousCanvas) {
              el.removeChild(previousCanvas);
            }
            el.appendChild(renderer[index].domElement);
  
            let geometry = new THREE.PlaneGeometry(1.55, 1, 20, 20),
              planeSpace =
                getPlaneWidth(el, camera[index]) * getWidth(options[index].gap);
  
            planes[index] = [];
  
            let loadedTextures = 0;
            const totalTextures = images.length;
  
            images.forEach(function (image, i) {
              let loader = new THREE.TextureLoader();
              loader.load(image, function (texture) {
                let material = new THREE.ShaderMaterial({
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
    `,
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
                planes[index][i].position.y =
                  -(row - offsetY) *
                  (planeHeight * getWidth(options[index].gap));
  
                scene[index].add(planes[index][i]);
  
                loadedTextures++;
                if (loadedTextures === totalTextures) {
                  renderer[index].render(scene[index], camera[index]);
                }
              });
            });
          });
        }
        init();
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
  
        function onResize() {
          const newWidth = window.innerWidth;
          const newHeight = window.innerHeight;
          if (newWidth === previousWidth) return;
          currentWidth = newWidth;
          mobileHeightChage = newWidth < 768;
          init("resize");
          previousWidth = newWidth;
        }
        let resizeTimeout;
        window.addEventListener("resize", () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            document
              .querySelectorAll('[aria-label="curved-image"]')
              .forEach((el, index) => {
                handleResize(el, index);
              });
          }, 100);
        });
      });
    }
