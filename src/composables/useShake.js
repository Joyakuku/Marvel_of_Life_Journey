
 

import { ref, reactive } from 'vue'

export function useShake(options = {}) {
  // 回调：检测通过时执行
  const onShake = typeof options.onShake === 'function' ? options.onShake : () => {}

  // 可调参数（依据设备实际情况可适度调整）
  const ORIENT_DELTA_THRESHOLD = options.orientThreshold ?? 32 // 方向变化阈值（角度差和）
  const MOTION_DIFF_THRESHOLD = options.motionThreshold ?? 10   // 加速度差值阈值（dx+dy+dz）
  const SHAKE_COOLDOWN_MS = options.cooldownMs ?? 1200          // 触发冷却时间，避免频繁触发
  const ORIENT_SAMPLE_INTERVAL = options.orientSampleMs ?? 80   // 方向采样间隔，抑制噪声
  const MOTION_SAMPLE_INTERVAL = options.motionSampleMs ?? 200  // 加速度采样间隔，抑制噪声

  // 状态
  const permissionGranted = ref(false)
  const bound = ref(false)
  const lastShakeTs = ref(0)
  const lastOrientTs = ref(0)
  const lastMotionTs = ref(0)
  const prevBeta = ref(null)
  const prevGamma = ref(null)
  const lastAcc = reactive({ x: 0, y: 0, z: 0 })
  const orientationCount = ref(0)
  const motionCount = ref(0)

  // 工具：角度差，处理[-180,180]的环绕差异
  const angleDelta = (a, b) => {
    if (a == null || b == null) return 0
    let d = Math.abs(a - b)
    return d > 180 ? 360 - d : d
  }

  // 方向事件处理
  const onDeviceOrientation = (evt) => {
    try {
      const beta = evt?.beta ?? 0
      const gamma = evt?.gamma ?? 0
      const now = Date.now()
      orientationCount.value++
      const db = angleDelta(beta, prevBeta.value)
      const dg = angleDelta(gamma, prevGamma.value)
      prevBeta.value = beta
      prevGamma.value = gamma
      if (now - lastOrientTs.value < ORIENT_SAMPLE_INTERVAL) return
      lastOrientTs.value = now
      if ((db + dg) > ORIENT_DELTA_THRESHOLD && now - lastShakeTs.value > SHAKE_COOLDOWN_MS) {
        lastShakeTs.value = now
        onShake()
      }
    } catch (e) {
      // 非致命错误，忽略
    }
  }

  // 加速度事件处理
  const onDeviceMotion = (evt) => {
    try {
      const a = evt?.accelerationIncludingGravity || evt?.acceleration || { x: 0, y: 0, z: 0 }
      const now = Date.now()
      motionCount.value++
      if (now - lastMotionTs.value < MOTION_SAMPLE_INTERVAL) return
      const dx = Math.abs((a.x || 0) - (lastAcc.x || 0))
      const dy = Math.abs((a.y || 0) - (lastAcc.y || 0))
      const dz = Math.abs((a.z || 0) - (lastAcc.z || 0))
      lastAcc.x = (a.x || 0); lastAcc.y = (a.y || 0); lastAcc.z = (a.z || 0)
      lastMotionTs.value = now
      const diff = dx + dy + dz
      if (diff > MOTION_DIFF_THRESHOLD && now - lastShakeTs.value > SHAKE_COOLDOWN_MS) {
        lastShakeTs.value = now
        onShake()
      }
    } catch (e) {
      // 非致命错误，忽略
    }
  }

  // 授权（iOS13+）：优先尝试方向权限，失败回退加速度权限
  const requestPermission = async () => {
    try {
      const DOE = window.DeviceOrientationEvent
      const DME = window.DeviceMotionEvent
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission()
        permissionGranted.value = (res === 'granted')
      } else if (DME && typeof DME.requestPermission === 'function') {
        const res = await DME.requestPermission()
        permissionGranted.value = (res === 'granted')
      } else {
        // 非权限模式（安卓等）直接视为就绪
        permissionGranted.value = true
      }
    } catch (e) {
      permissionGranted.value = false
    }
    return permissionGranted.value
  }

  // 绑定/解绑监听
  const bind = () => {
    if (bound.value) return
    let ok = false
    try { window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true }); ok = true } catch (e) {}
    try { window.addEventListener('devicemotion', onDeviceMotion, { passive: true }); ok = true } catch (e) {}
    bound.value = ok
    return ok
  }
  const unbind = () => {
    try { window.removeEventListener('deviceorientation', onDeviceOrientation) } catch (e) {}
    try { window.removeEventListener('devicemotion', onDeviceMotion) } catch (e) {}
    bound.value = false
  }

  // 对外API
  const ensureAccess = async () => { await requestPermission(); unbind(); bind() }
  const start = () => { bind() }
  const stop = () => { unbind() }

  return {
    ensureAccess,
    start,
    stop,
    state: {
      permissionGranted,
      bound,
      orientationCount,
      motionCount
    }
  }
}