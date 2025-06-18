import { useEffect } from "react"
import * as THREE from "three"

export function CurvedImageEffect() {
    useEffect(() => {
        if (window.curvedOnce) return
        window.curvedOnce = true

        let isMobile = window.innerWidth <= 809
        let animationFrameId = null

        const textureLoader = new THREE.TextureLoader()

        const selector = '[aria-label="curved-image"]'
        const scene = [],
            renderer = [],
            options = [],
            camera = [],
            currentContainerHeight = [],
            previousContainerHeight = [],
            planes = []

        const getWidth = (gap) => 1 + gap / 100

        const getPlaneWidth = (el, camera) => {
            const vFov = (camera.fov * Math.PI) / 180
            const height = 2 * Math.tan(vFov / 2) * camera.position.z
            const aspect = el.clientWidth / el.clientHeight
            const width = height * aspect
            return el.clientWidth / width
        }

        function removeSourceImages(el) {
            const target = el.querySelector('[data-framer-name="images-grid"]')
            if (target) target.remove()
        }

        const sharedGeometry = new THREE.PlaneGeometry(1.6, 1, 8, 8)

        const init = (e = "none") => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId)

            const isMobile = window.innerWidth <= 809
            document.querySelectorAll(selector).forEach((el, index) => {
                if (planes[index]) {
                    planes[index].forEach((mesh) => {
                        if (mesh.material) mesh.material.dispose()
                        if (mesh.material.map) mesh.material.map.dispose()
                        scene[index]?.remove(mesh)
                    })
                }

                planes[index] = []

                if (e === "none") {
                    currentContainerHeight[index] = previousContainerHeight[
                        index
                    ] = el.clientHeight
                } else {
                    currentContainerHeight[index] = el.clientHeight
                }
                previousContainerHeight[index] = currentContainerHeight[index]

                options[index] = {
                    gap: 8,
                    curve: 20,
                }

                let images = []
                const imageElements = el.querySelectorAll("img")

                if (imageElements.length > 0) {
                    imageElements.forEach((img) => {
                        images.push(img.getAttribute("src"))
                    })
                    el.dataset.imageList = JSON.stringify(images)
                    removeSourceImages(el)
                } else if (el.dataset.imageList) {
                    const saved = el.dataset.imageList
                    images = saved ? JSON.parse(saved) : []
                }

                scene[index] = new THREE.Scene()
                camera[index] = new THREE.PerspectiveCamera(
                    75,
                    el.clientWidth / el.clientHeight,
                    0.1,
                    20
                )
                camera[index].position.z = isMobile ? 2.85 : 1.85

                renderer[index] = new THREE.WebGLRenderer({
                    alpha: true,
                    antialias: true,
                })
                renderer[index].setSize(el.clientWidth, el.clientHeight)
                renderer[index].setPixelRatio(window.devicePixelRatio)

                const previousCanvas = el.querySelector("canvas")
                if (previousCanvas) el.removeChild(previousCanvas)
                el.appendChild(renderer[index].domElement)

                const planeSpace =
                    getPlaneWidth(el, camera[index]) *
                    getWidth(options[index].gap)

                let loadedTextures = 0
                const totalTextures = images.length

                images.forEach((image, i) => {
                    textureLoader.load(image, (texture) => {
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
                  newPosition.z += (x * x) * bendFactor * 0.5;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }`,
                            fragmentShader: `
                uniform sampler2D tex;
                varying vec2 vertexUV;
                void main() {
                  gl_FragColor = texture2D(tex, vertexUV);
                }`,
                        })

                        planes[index][i] = new THREE.Mesh(
                            sharedGeometry,
                            material
                        )

                        const maxStretchCompensation = isMobile ? 0 : 0.29

                        const columns = isMobile ? 2 : 3
                        const rows = Math.ceil(totalTextures / columns)

                        const planeWidth = 1.55
                        const planeHeight = 1
                        const averageStretch = 1 - maxStretchCompensation / 2
                        const spacing =
                            planeWidth *
                            getWidth(options[index].gap) *
                            averageStretch
                        const col = i % columns
                        const row = Math.floor(i / columns)
                        const offsetX = (columns - 1) / 2
                        const offsetY = (rows - 1) / 2

                        planes[index][i].position.x = (col - offsetX) * spacing
                        planes[index][i].position.y =
                            -(row - offsetY) *
                            (planeHeight * getWidth(options[index].gap))

                        const distanceFromCenter = Math.abs(col - offsetX)

                        if (!isMobile) {
                            const stretchFactor =
                                1 -
                                distanceFromCenter *
                                    (maxStretchCompensation / offsetX)
                            planes[index][i].scale.x = stretchFactor
                        }

                        scene[index].add(planes[index][i])

                        loadedTextures++
                        if (loadedTextures === totalTextures) {
                            function renderLoop() {
                                renderer[index].render(
                                    scene[index],
                                    camera[index]
                                )
                                animationFrameId =
                                    requestAnimationFrame(renderLoop)
                            }
                            renderLoop()
                        }
                    })
                })
            })
        }

        function handleResize(el, index) {
            const width = el.clientWidth
            const height = el.clientHeight
            renderer[index].setSize(width, height)
            camera[index].aspect = width / height
            camera[index].updateProjectionMatrix()
            renderer[index].render(scene[index], camera[index])
        }

        let currentWidth,
            previousWidth = window.innerWidth

        init()

        let resizeTimeout
        function handleWindowResize() {
            clearTimeout(resizeTimeout)
            resizeTimeout = setTimeout(() => {
                const nowMobile = window.innerWidth <= 809

                // Detect change in mobile/desktop layout
                if (nowMobile !== isMobile) {
                    isMobile = nowMobile
                    init() // Recreate scenes with updated grid
                } else {
                    document.querySelectorAll(selector).forEach((el, index) => {
                        handleResize(el, index)
                    })
                }
            }, 100)
        }

        window.addEventListener("resize", handleWindowResize)

        return () => {
            window.removeEventListener("resize", handleWindowResize)

            document.querySelectorAll(selector).forEach((el, index) => {
                if (planes[index]) {
                    planes[index].forEach((mesh) => {
                        if (mesh.material) mesh.material.dispose()
                        if (mesh.material.map) mesh.material.map.dispose()
                        scene[index]?.remove(mesh)
                    })
                }

                if (renderer[index]) {
                    renderer[index].dispose()
                    const canvas = el.querySelector("canvas")
                    if (canvas) el.removeChild(canvas)
                }
            })

            sharedGeometry.dispose()

            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
                animationFrameId = null
            }
        }
    }, [])

    return (
        <div style={{ width: "100%", height: "100%", pointerEvents: "none" }} />
    )
}
