<template>
  <view class="weather-backdrop" :class="`scene-${weatherScene}`" aria-hidden="true">
    <view class="weather-glow"></view>

    <view v-if="weatherScene === 'rain' || weatherScene === 'thunder'" class="rain-layer">
      <view
        v-for="item in rainDrops"
        :key="item.id"
        class="rain-drop"
        :style="item.style"
      ></view>
    </view>

    <view v-else-if="weatherScene === 'snow'" class="snow-layer">
      <view
        v-for="item in snowFlakes"
        :key="item.id"
        class="snowflake-dot"
        :style="item.style"
      ></view>
    </view>

    <view v-else-if="weatherScene === 'dust'" class="dust-layer">
      <view
        v-for="item in dustSpecks"
        :key="item.id"
        class="dust-speck"
        :style="item.style"
      ></view>
    </view>
  </view>
</template>

<script>
  import { computed } from 'vue'
  import { useHAStore } from '../store/ha-store.js'

  function buildParticleSet(kind, count) {
    return Array.from({ length: count }, (_, index) => {
      const left = `${(index * 11) % 100}%`
      const delay = `${(index % 7) * 0.3}s`

      if (kind === 'snow') {
        return {
          id: `${kind}-${index}`,
          style: {
            left,
            animationDelay: delay,
            animationDuration: `${5 + (index % 4) * 0.8}s`,
            width: `${8 + (index % 3) * 4}px`,
            height: `${8 + (index % 3) * 4}px`
          }
        }
      }

      if (kind === 'dust') {
        return {
          id: `${kind}-${index}`,
          style: {
            left,
            animationDelay: delay,
            animationDuration: `${6 + (index % 4) * 1.2}s`,
            width: `${20 + (index % 3) * 10}px`,
            height: `${20 + (index % 3) * 10}px`
          }
        }
      }

      return {
        id: `${kind}-${index}`,
        style: {
          left,
          animationDelay: delay,
          animationDuration: `${2 + (index % 4) * 0.2}s`
        }
      }
    })
  }

  export default {
    setup() {
      const store = useHAStore()
      const weatherScene = computed(() => store.weather.scene || 'cloud')
      const rainDrops = buildParticleSet('rain', 18)
      const snowFlakes = buildParticleSet('snow', 22)
      const dustSpecks = buildParticleSet('dust', 14)

      return {
        weatherScene,
        rainDrops,
        snowFlakes,
        dustSpecks
      }
    }
  }
</script>

<style scoped>
  .weather-backdrop {
    --weather-accent: rgba(207, 231, 255, 0.32);
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  .weather-glow {
    position: absolute;
    top: 24%;
    left: 50%;
    width: min(56vw, 460px);
    height: min(30vw, 220px);
    transform: translateX(-50%);
    border-radius: 50%;
    background: radial-gradient(circle, var(--weather-accent) 0%, transparent 72%);
    filter: blur(20px);
    opacity: 0.95;
  }

  .rain-layer,
  .snow-layer,
  .dust-layer {
    position: absolute;
    inset: 0;
  }

  .rain-drop {
    position: absolute;
    top: -12%;
    width: 2px;
    height: 88px;
    background: linear-gradient(180deg, rgba(181, 228, 255, 0), rgba(181, 228, 255, 0.82));
    transform: rotate(18deg);
    animation: rain-fall linear infinite;
  }

  .snowflake-dot {
    position: absolute;
    top: -12%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 0 18px rgba(255, 255, 255, 0.55);
    animation: snow-fall linear infinite;
  }

  .dust-speck {
    position: absolute;
    top: 8%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(240, 189, 110, 0.78) 0%, rgba(240, 189, 110, 0) 72%);
    filter: blur(2px);
    animation: dust-float linear infinite;
  }

  .scene-clear {
    --weather-accent: rgba(255, 214, 145, 0.28);
  }

  .scene-cloud {
    --weather-accent: rgba(203, 227, 255, 0.28);
  }

  .scene-rain,
  .scene-thunder {
    --weather-accent: rgba(148, 197, 255, 0.3);
  }

  .scene-snow {
    --weather-accent: rgba(235, 243, 255, 0.34);
  }

  .scene-dust {
    --weather-accent: rgba(241, 194, 117, 0.24);
  }

  @keyframes rain-fall {
    0% {
      transform: translate3d(0, -20%, 0) rotate(18deg);
      opacity: 0;
    }

    20% {
      opacity: 1;
    }

    100% {
      transform: translate3d(-36px, 120vh, 0) rotate(18deg);
      opacity: 0;
    }
  }

  @keyframes snow-fall {
    0% {
      transform: translate3d(0, -10%, 0);
      opacity: 0;
    }

    20% {
      opacity: 0.94;
    }

    100% {
      transform: translate3d(28px, 112vh, 0);
      opacity: 0;
    }
  }

  @keyframes dust-float {
    0% {
      transform: translate3d(-12vw, 0, 0);
      opacity: 0;
    }

    15% {
      opacity: 0.48;
    }

    100% {
      transform: translate3d(112vw, 30vh, 0);
      opacity: 0;
    }
  }
</style>
