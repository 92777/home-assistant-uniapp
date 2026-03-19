/**
 * 中国天气网响应解析与天气场景映射
 */

const WEATHER_SCENE_RULES = [
  { scene: 'thunder', pattern: /雷|暴/ },
  { scene: 'snow', pattern: /雪|冰粒|雨夹雪/ },
  { scene: 'rain', pattern: /雨|阵雨|雷阵雨/ },
  { scene: 'dust', pattern: /沙|浮尘|扬沙|霾|雾霾/ },
  { scene: 'cloud', pattern: /阴|云/ },
  { scene: 'clear', pattern: /晴/ }
]

function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text)
  } catch (error) {
    return fallback
  }
}

function extractAssignedObject(source = '', variableName = '') {
  const marker = `var ${variableName}`
  const markerIndex = source.indexOf(marker)

  if (markerIndex === -1) {
    return null
  }

  const assignIndex = source.indexOf('=', markerIndex)
  const objectStart = source.indexOf('{', assignIndex)

  if (assignIndex === -1 || objectStart === -1) {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = objectStart; index < source.length; index++) {
    const char = source[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1

      if (depth === 0) {
        return safeJsonParse(source.slice(objectStart, index + 1))
      }
    }
  }

  return null
}

function normalizeWeatherNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numericValue = Number.parseFloat(String(value).replace(/[^\d.-]/g, ''))

  return Number.isFinite(numericValue) ? numericValue : null
}

function normalizeHumidity(value) {
  return normalizeWeatherNumber(String(value || '').replace('%', ''))
}

function normalizeForecastItem(item = {}) {
  const high = normalizeWeatherNumber(item.fc)
  const low = normalizeWeatherNumber(item.fd)

  return {
    dateLabel: item.fi || '',
    weekLabel: item.fj || '',
    high,
    low
  }
}

export function parseWeatherSearchResponse(source = '') {
  const trimmedSource = source.trim()

  if (!trimmedSource) {
    return []
  }

  const payload = trimmedSource
    .replace(/^\(/, '')
    .replace(/\)\s*;?\s*$/, '')

  const parsed = safeJsonParse(payload, [])

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.map((item) => {
    const rawRef = item.ref || ''
    const segments = rawRef.split('~')
    const cityCode = (segments[0] || '').match(/^\d{9}/)?.[0] || ''

    return {
      rawRef,
      cityCode,
      province: segments[1] || '',
      cityName: segments[2] || '',
      displayName: segments[4] || segments[2] || ''
    }
  })
}

export function parseWeatherObservationResponse(source = '') {
  return extractAssignedObject(source, 'dataSK')
}

export function parseWeatherIndexResponse(source = '') {
  return {
    cityWeather: extractAssignedObject(source, 'cityDZ'),
    observation: extractAssignedObject(source, 'dataSK'),
    lifestyle: extractAssignedObject(source, 'dataZS'),
    forecast: extractAssignedObject(source, 'fc')
  }
}

export function resolveWeatherScene(weatherText = '', weatherCode = '') {
  const source = `${weatherText} ${weatherCode}`.trim()

  for (const rule of WEATHER_SCENE_RULES) {
    if (rule.pattern.test(source)) {
      return rule.scene
    }
  }

  return 'cloud'
}

export function getWeatherIcon(scene = 'cloud') {
  const iconMap = {
    clear: 'icon-sun',
    cloud: 'icon-cloud-sun',
    rain: 'icon-cloud-rain',
    snow: 'icon-snowflake',
    dust: 'icon-smog',
    thunder: 'icon-cloud-bolt'
  }

  return iconMap[scene] || 'icon-cloud'
}

export function createDefaultWeather() {
  return {
    cityCode: '',
    cityName: '天气加载中',
    text: '多云',
    scene: 'cloud',
    icon: getWeatherIcon('cloud'),
    temperature: null,
    humidity: null,
    aqi: null,
    pm25: null,
    high: null,
    low: null,
    windDirection: '',
    windScale: '',
    updateTime: '',
    forecast: []
  }
}

export function normalizeChineseWeather({
  city = null,
  observation = null,
  indexData = null
} = {}) {
  const cityWeather = indexData?.cityWeather?.weatherinfo || {}
  const realtime = observation || indexData?.observation || {}
  const forecastList = Array.isArray(indexData?.forecast?.f) ? indexData.forecast.f : []
  const condition = realtime.weather || cityWeather.weather || '多云'
  const scene = resolveWeatherScene(condition, realtime.weathercode || cityWeather.weathercode)

  return {
    cityCode: city?.cityCode || realtime.city || '',
    cityName: city?.cityName || realtime.cityname || cityWeather.city || '未知城市',
    text: condition,
    scene,
    icon: getWeatherIcon(scene),
    temperature: normalizeWeatherNumber(realtime.temp),
    humidity: normalizeHumidity(realtime.SD || realtime.sd),
    aqi: normalizeWeatherNumber(realtime.aqi),
    pm25: normalizeWeatherNumber(realtime.aqi_pm25),
    high: normalizeWeatherNumber(cityWeather.temp),
    low: normalizeWeatherNumber(cityWeather.tempn),
    windDirection: realtime.WD || cityWeather.wd || '',
    windScale: realtime.WS || cityWeather.ws || '',
    updateTime: realtime.time || '',
    forecast: forecastList.slice(0, 5).map(normalizeForecastItem)
  }
}
