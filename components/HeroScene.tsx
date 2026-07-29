"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type ThemeMode = "dark" | "light"
type InteractionMode = "interactive" | "breathing" | "wave" | "sweep"

export function HeroScene({
  theme = "dark",
  mode = "interactive",
}: {
  theme?: ThemeMode
  mode?: InteractionMode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef<InteractionMode>(mode)
  const themeRef = useRef<ThemeMode>(theme)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { themeRef.current = theme }, [theme])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ── SCENE SETUP ──────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const width = container.clientWidth
    const height = container.clientHeight
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100)
    const baseCamPos = new THREE.Vector3(18, 22, 18)
    camera.position.copy(baseCamPos)
    camera.lookAt(0, -0.5, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = false
    container.appendChild(renderer.domElement)

    // ── LIGHTS ───────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x141226, 1.6)
    scene.add(ambientLight)
    const dirLight1 = new THREE.DirectionalLight(0x6366f1, 1.4)
    dirLight1.position.set(12, 22, 16)
    scene.add(dirLight1)
    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.9)
    dirLight2.position.set(-12, 12, -12)
    scene.add(dirLight2)

    // ── GRID SETUP ───────────────────────────────────────────────────
    const GRID_SIZE = 13
    const SPACING = 1.15
    const CUBE_SIZE = 0.95
    const halfGrid = ((GRID_SIZE - 1) * SPACING) / 2
    const instanceCount = GRID_SIZE * GRID_SIZE

    const mainGroup = new THREE.Group()
    scene.add(mainGroup)

    // Floor dot matrix — dark at corners, gray toward center
    const floorDotGeometry = new THREE.BufferGeometry()
    const floorPositions: number[] = []
    const floorColors: number[] = []
    const cornerDotColor = new THREE.Color(0x020305)
    const grayDotColor = new THREE.Color(0x475569)

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = i * SPACING - halfGrid
        const z = j * SPACING - halfGrid
        const tCorner = (Math.abs(x) + Math.abs(z)) / (2 * halfGrid)
        const dotColor = new THREE.Color().copy(cornerDotColor).lerp(
          grayDotColor, Math.pow(Math.max(0, 1 - tCorner), 1.2)
        )
        floorPositions.push(x, 0, z)
        floorColors.push(dotColor.r, dotColor.g, dotColor.b)
      }
    }
    floorDotGeometry.setAttribute("position", new THREE.Float32BufferAttribute(floorPositions, 3))
    floorDotGeometry.setAttribute("color", new THREE.Float32BufferAttribute(floorColors, 3))

    const dotCanvas = document.createElement("canvas")
    dotCanvas.width = 32; dotCanvas.height = 32
    const dotCtx = dotCanvas.getContext("2d")
    if (dotCtx) {
      dotCtx.fillStyle = "#ffffff"
      dotCtx.beginPath()
      dotCtx.arc(16, 16, 12, 0, Math.PI * 2)
      dotCtx.fill()
    }
    const dotTexture = new THREE.CanvasTexture(dotCanvas)

    const floorPointsMaterial = new THREE.PointsMaterial({
      size: 0.12, vertexColors: true, map: dotTexture,
      transparent: true, alphaTest: 0.05, opacity: 0.5,
    })
    const floorPoints = new THREE.Points(floorDotGeometry, floorPointsMaterial)
    floorPoints.position.y = -0.02
    mainGroup.add(floorPoints)

    // Cubes — pure black, no lighting response
    const boxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const cubeMesh = new THREE.InstancedMesh(boxGeometry, boxMaterial, instanceCount)
    cubeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mainGroup.add(cubeMesh)

    // Edge wireframes
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry)
    const edgeGroup = new THREE.Group()
    mainGroup.add(edgeGroup)
    const cubeEdgesList: THREE.LineSegments[] = []
    for (let i = 0; i < instanceCount; i++) {
      const edgeSeg = new THREE.LineSegments(
        edgesGeometry,
        new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0 })
      )
      edgeGroup.add(edgeSeg)
      cubeEdgesList.push(edgeSeg)
    }

    // Arrow pads
    const arrowGroup = new THREE.Group()
    mainGroup.add(arrowGroup)
    const createArrowPadGeometry = () => {
      const g = new THREE.BufferGeometry()
      const pts: number[] = []
      const s = CUBE_SIZE / 2 + 0.08
      pts.push(-s, 0, -s, s, 0, -s, s, 0, -s, s, 0, s, s, 0, s, -s, 0, s, -s, 0, s, -s, 0, -s)
      const d = s + 0.14; const arr = 0.09
      pts.push(0, 0, -d, -arr, 0, -d + arr, 0, 0, -d, arr, 0, -d + arr)
      pts.push(0, 0, d, -arr, 0, d - arr, 0, 0, d, arr, 0, d - arr)
      pts.push(d, 0, 0, d - arr, 0, -arr, d, 0, 0, d - arr, 0, arr)
      pts.push(-d, 0, 0, -d + arr, 0, -arr, -d, 0, 0, -d + arr, 0, arr)
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3))
      return g
    }
    const arrowPadGeo = createArrowPadGeometry()
    const arrowPadsList: THREE.LineSegments[] = []
    for (let i = 0; i < instanceCount; i++) {
      const arrowSeg = new THREE.LineSegments(
        arrowPadGeo,
        new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0 })
      )
      arrowSeg.position.y = 0.01
      arrowGroup.add(arrowSeg)
      arrowPadsList.push(arrowSeg)
    }

    // ── STATE ────────────────────────────────────────────────────────
    const heights = new Float32Array(instanceCount)
    const targetHeights = new Float32Array(instanceCount)

    const gradientPalette = [
      new THREE.Color("#00F3FF"), new THREE.Color("#00FFAA"),
      new THREE.Color("#0066FF"), new THREE.Color("#FF0080"),
      new THREE.Color("#9D00FF"),
    ]

    const raycastPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const raycaster = new THREE.Raycaster()
    const mouseNorm = new THREE.Vector2(-999, -999)
    const targetMouseNorm = new THREE.Vector2(0, 0)
    const smoothMouseNorm = new THREE.Vector2(0, 0)

    let isMouseActive = false
    let mouseInactivityTimer: ReturnType<typeof setTimeout> | null = null

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      targetMouseNorm.set(x, y); mouseNorm.set(x, y)
      isMouseActive = true
      if (mouseInactivityTimer) clearTimeout(mouseInactivityTimer)
      mouseInactivityTimer = setTimeout(() => { isMouseActive = false }, 1200)
    }
    const handleMouseLeave = () => {
      isMouseActive = false; targetMouseNorm.set(0, 0)
    }
    window.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseleave", handleMouseLeave)

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth; const h = container.clientHeight
      camera.aspect = w / h; camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener("resize", handleResize)

    // ── ANIMATION LOOP ───────────────────────────────────────────────
    const dummyMatrix = new THREE.Matrix4()
    const dummyVector = new THREE.Vector3()
    const rayIntersect = new THREE.Vector3()
    const tempColor = new THREE.Color()
    const idleColor = new THREE.Color()
    const finalColor = new THREE.Color()
    const darkCornerColor = new THREE.Color(0x020305)
    const grayCenterColor = new THREE.Color(0x52525b)

    let animationFrameId: number
    const clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()
      const currentMode = modeRef.current

      // Camera parallax
      smoothMouseNorm.x += (targetMouseNorm.x - smoothMouseNorm.x) * 0.05
      smoothMouseNorm.y += (targetMouseNorm.y - smoothMouseNorm.y) * 0.05
      camera.position.x = baseCamPos.x + smoothMouseNorm.x * 1.2
      camera.position.y = baseCamPos.y + smoothMouseNorm.y * 0.8
      camera.position.z = baseCamPos.z - smoothMouseNorm.x * 0.6
      camera.lookAt(0, -0.2, 0)

      // Scene float
      const sceneFloatY = Math.sin(elapsedTime * 0.8) * 0.08
      mainGroup.position.y = sceneFloatY
      mainGroup.rotation.y = Math.sin(elapsedTime * 0.5) * 0.008

      // Raycast
      raycaster.setFromCamera(mouseNorm, camera)
      const isIntersecting = raycaster.ray.intersectPlane(raycastPlane, rayIntersect)

      // Calculate heights
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          const idx = i * GRID_SIZE + j
          const x = i * SPACING - halfGrid
          const z = j * SPACING - halfGrid
          let targetH = 0

          if (currentMode === "interactive") {
            if (isMouseActive && isIntersecting) {
              const dx = x - rayIntersect.x
              const dz = z - rayIntersect.z
              const dist = Math.sqrt(dx * dx + dz * dz)
              if (dist < 3.6) {
                targetH = Math.exp(-(dist * dist) / (2 * 1.2 * 1.2)) * 1.4
              }
            } else {
              const distFromCenter = Math.sqrt(x * x + z * z)
              const waveVal = Math.sin(elapsedTime * 1.8 - distFromCenter * 0.8)
              if (waveVal > 0.4) targetH = (waveVal - 0.4) * 1.1
            }
          }

          targetHeights[idx] = targetH
          heights[idx] += (targetHeights[idx] - heights[idx]) * 0.12
        }
      }

      // Update meshes
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          const idx = i * GRID_SIZE + j
          const x = i * SPACING - halfGrid
          const z = j * SPACING - halfGrid
          const h = heights[idx]
          const objectFloat = Math.sin(elapsedTime * 1.2 + i * 0.3 + j * 0.2) * 0.04
          const posY = CUBE_SIZE / 2 + h + objectFloat

          dummyVector.set(x, posY, z)
          dummyMatrix.setPosition(dummyVector)
          cubeMesh.setMatrixAt(idx, dummyMatrix)

          const edgeLine = cubeEdgesList[idx]
          const arrowPad = arrowPadsList[idx]

          edgeLine.visible = true
          arrowPad.visible = true
          edgeLine.position.copy(dummyVector)

          // Base idle gradient: dark at corners, gray at center
          const tCorner = (Math.abs(x) + Math.abs(z)) / (2 * halfGrid)
          idleColor.copy(darkCornerColor).lerp(grayCenterColor, Math.pow(Math.max(0, 1 - tCorner), 1.1))

          // Active neon color field
          const u = (x + halfGrid) / (halfGrid * 2)
          const v = (z + halfGrid) / (halfGrid * 2)
          let fieldVal = (u * 0.55 + v * 0.45 + elapsedTime * 0.02) % 1.0
          if (fieldVal < 0) fieldVal += 1.0

          const scaledPos = fieldVal * (gradientPalette.length - 1)
          const index0 = Math.floor(scaledPos)
          const index1 = Math.min(index0 + 1, gradientPalette.length - 1)
          tempColor.copy(gradientPalette[index0]).lerp(gradientPalette[index1], scaledPos - index0)

          const intensity = Math.min(1.0, h / 0.75)

          // Blend from corner-dark to neon as cubes elevate
          finalColor.copy(idleColor).lerp(tempColor, intensity)

          const edgeMat = edgeLine.material as THREE.LineBasicMaterial
          edgeMat.color.copy(finalColor)
          const idleEdgeOpacity = 0.12 + (1 - tCorner) * 0.22
          edgeMat.opacity = idleEdgeOpacity + intensity * (0.85 - idleEdgeOpacity)

          arrowPad.position.set(x, 0.01 + sceneFloatY * 0.1, z)
          const arrowMat = arrowPad.material as THREE.LineBasicMaterial
          arrowMat.color.copy(finalColor)
          const idlePadOpacity = 0.08 + (1 - tCorner) * 0.18
          arrowMat.opacity = idlePadOpacity + intensity * (0.75 - idlePadOpacity)
        }
      }

      cubeMesh.instanceMatrix.needsUpdate = true
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseleave", handleMouseLeave)
      window.removeEventListener("resize", handleResize)
      if (mouseInactivityTimer) clearTimeout(mouseInactivityTimer)
      boxGeometry.dispose(); boxMaterial.dispose()
      edgesGeometry.dispose(); arrowPadGeo.dispose()
      floorDotGeometry.dispose(); floorPointsMaterial.dispose()
      dotTexture.dispose(); renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 size-full cursor-crosshair overflow-hidden select-none"
    />
  )
}
