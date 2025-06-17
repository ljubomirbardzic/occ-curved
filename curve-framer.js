import { useEffect } from "react"
import * as THREE from "three"

export function CurvedImageEffect() {
    useEffect(() => {
        if (window.curvedOnce) return
        window.curvedOnce = true

        let isMobile = window.innerWidth <= 819
        let animationFrameId = null

        const selector = '[aria-label="curved-image"]'
        const scene = [],
            renderer = [],
            options = [],
            camera = [],
            currentContainerHeight = [],
            previousContainerHeight = [],
            planes = []

        const geometries = []

        let isDragging = false
        let lastMouseX = 0
        let lastMouseY = 0
        let deltaX = 0
        let deltaY = 0
        let moved = false

        let targetRotX = 0
        let targetRotY = 0

        const MAX_ROT_X = 0.025
        const MAX_ROT_Y = 0.025

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

        const init = (e = "none") => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId)

            const isMobile = window.innerWidth <= 819
            document.querySelectorAll(selector).forEach((el, index) => {
                // CLEANUP: remove previous canvas and dispose planes if any
                const existingCanvas = el.querySelector("canvas")
                if (existingCanvas) el.removeChild(existingCanvas)

                if (planes[index]) {
                    planes[index].forEach((mesh) => {
                        if (mesh.material) mesh.material.dispose()
                        if (mesh.material.map) mesh.material.map.dispose()
                        scene[index]?.remove(mesh)
                    })
                }

                planes[index] = []

                if (geometries[index]) {
                    geometries[index].dispose()
                    geometries[index] = null
                }

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
                    images = JSON.parse(el.dataset.imageList)
                }
                planes[index] = []

                scene[index] = new THREE.Scene()
                camera[index] = new THREE.PerspectiveCamera(
                    75,
                    el.clientWidth / el.clientHeight,
                    0.1,
                    20
                )
                camera[index].position.z = isMobile ? 2.75 : 1.7

                renderer[index] = new THREE.WebGLRenderer({
                    alpha: true,
                    antialias: true,
                })
                renderer[index].setSize(el.clientWidth, el.clientHeight)
                renderer[index].setPixelRatio(window.devicePixelRatio)

                const previousCanvas = el.querySelector("canvas")
                if (previousCanvas) el.removeChild(previousCanvas)
                el.appendChild(renderer[index].domElement)

                const geometry = new THREE.PlaneGeometry(1.55, 1, 20, 20)
                geometries[index] = geometry
                const planeSpace =
                    getPlaneWidth(el, camera[index]) *
                    getWidth(options[index].gap)
                planes[index] = []

                let loadedTextures = 0
                const totalTextures = images.length

                images.forEach((image, i) => {
                    const loader = new THREE.TextureLoader()
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
                }`,
                            fragmentShader: `
                uniform sampler2D tex;
                varying vec2 vertexUV;
                void main() {
                  gl_FragColor = texture2D(tex, vertexUV);
                }`,
                        })

                        planes[index][i] = new THREE.Mesh(geometry, material)

                        const maxStretchCompensation = isMobile ? 0 : 0.3

                        const columns = window.innerWidth <= 819 ? 2 : 3
                        const rows = Math.ceil(totalTextures / columns)

                        const planeWidth = 1.5
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
                            function animateCamera() {
                                if (moved) {
                                    targetRotY += deltaX * 0.0002
                                    targetRotX += deltaY * 0.0002
                                    deltaX = 0
                                    deltaY = 0
                                    moved = false
                                }

                                // Clamp
                                targetRotX = Math.max(
                                    -MAX_ROT_X,
                                    Math.min(MAX_ROT_X, targetRotX)
                                )
                                targetRotY = Math.max(
                                    -MAX_ROT_Y,
                                    Math.min(MAX_ROT_Y, targetRotY)
                                )

                                camera[index].rotation.x +=
                                    (targetRotX - camera[index].rotation.x) *
                                    0.05
                                camera[index].rotation.y +=
                                    (targetRotY - camera[index].rotation.y) *
                                    0.05

                                renderer[index].render(
                                    scene[index],
                                    camera[index]
                                )
                                animationFrameId =
                                    requestAnimationFrame(animateCamera)
                            }
                            animateCamera()
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
                const nowMobile = window.innerWidth <= 819

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

        function handleMouseDown(e) {
            isDragging = true
            lastMouseX = e.clientX
            lastMouseY = e.clientY
        }

        function handleMouseUp() {
            isDragging = false
        }

        function handleTouchStart(e) {
            isDragging = true
            const touch = e.touches[0]
            lastMouseX = touch.clientX
            lastMouseY = touch.clientY
        }

        function handleTouchEnd() {
            isDragging = false
        }

        function handleMouseMove(e) {
            if (!isDragging) return
            deltaX += e.clientX - lastMouseX
            deltaY += e.clientY - lastMouseY
            moved = true
            lastMouseX = e.clientX
            lastMouseY = e.clientY
        }

        function handleTouchMove(e) {
            if (!isDragging || e.touches.length === 0) return
            const touch = e.touches[0]
            deltaX += touch.clientX - lastMouseX
            deltaY += touch.clientY - lastMouseY
            moved = true
            lastMouseX = touch.clientX
            lastMouseY = touch.clientY
        }

        window.addEventListener("mousedown", handleMouseDown)
        window.addEventListener("mouseup", handleMouseUp)
        window.addEventListener("touchstart", handleTouchStart)
        window.addEventListener("touchend", handleTouchEnd)

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("touchmove", handleTouchMove)
        window.addEventListener("resize", handleWindowResize)

        return () => {
            window.removeEventListener("resize", handleWindowResize)
            window.removeEventListener("mousedown", handleMouseDown)
            window.removeEventListener("mouseup", handleMouseUp)
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("touchstart", handleTouchStart)
            window.removeEventListener("touchend", handleTouchEnd)
            window.removeEventListener("touchmove", handleTouchMove)

            document.querySelectorAll(selector).forEach((el, index) => {
                if (planes[index]) {
                    planes[index].forEach((mesh) => {
                        if (mesh.material) mesh.material.dispose()
                        if (mesh.material.map) mesh.material.map.dispose()
                        scene[index]?.remove(mesh)
                    })
                }

                if (geometries[index]) {
                    geometries[index].dispose()
                }

                if (renderer[index]) {
                    renderer[index].dispose()
                    const canvas = el.querySelector("canvas")
                    if (canvas) el.removeChild(canvas)
                }
            })
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
