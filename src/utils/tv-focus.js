const TV_QUERY_KEYS = ['tv', 'tvMode']
const FOCUS_SELECTOR = [
  '[data-tv-focus]',
  'input',
  'button',
  '.form-input',
  '.primary-btn',
  '.ghost-btn',
  '.back-btn',
  '.clear-icon',
  '.icon-btn',
  '.tabbar-item',
  '.section-link',
  '.tag-item',
  '.activity-pill',
  '.climate-card',
  '.common-card',
  '.room-card',
  '.device-row',
  '.entity-row',
  '.featured-action-card',
  '.action-card',
  '.result-item',
  '.health-item',
  '.menu-item',
  '.support-card',
  '.notice-close',
  '.detail-close'
].join(',')

function isBrowserRuntime() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function isEditableElement(element) {
  const tagName = element?.tagName?.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || element?.isContentEditable
}

function isElementVisible(element) {
  if (!element || element.disabled || element.getAttribute('aria-hidden') === 'true') {
    return false
  }

  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
}

function shouldEnableTvMode() {
  const params = new URLSearchParams(window.location.search)
  const queryEnabled = TV_QUERY_KEYS.some((key) => {
    const value = params.get(key)
    return value === '' || value === '1' || value === 'true'
  })
  const largeLandscape = window.matchMedia('(min-width: 1200px) and (orientation: landscape)').matches
  return queryEnabled || largeLandscape
}

function markTvMode(enabled) {
  document.documentElement.classList.toggle('tv-mode', enabled)
  document.body?.classList.toggle('tv-mode', enabled)
}

function getActiveFocusRoot() {
  const overlay = Array.from(document.querySelectorAll('.device-sheet-panel, .notice-panel')).find(isElementVisible)
  return overlay || document
}

function getFocusableElements(root = getActiveFocusRoot()) {
  return Array.from(root.querySelectorAll(FOCUS_SELECTOR))
    .filter(isElementVisible)
    .map((element) => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0')
      }
      element.classList.add('tv-focusable')
      return element
    })
}

function clearCurrentFocus() {
  document.querySelectorAll('.tv-focus-current').forEach((element) => {
    element.classList.remove('tv-focus-current')
  })
}

function focusElement(element) {
  if (!element) {
    return
  }

  clearCurrentFocus()
  element.classList.add('tv-focus-current')
  element.focus({ preventScroll: true })
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest'
  })
}

function ensureFocusedElement(elements) {
  const active = document.activeElement
  if (active && elements.includes(active)) {
    active.classList.add('tv-focus-current')
    return active
  }

  const first = elements[0]
  focusElement(first)
  return first
}

function getDirectionScore(currentRect, candidateRect, direction) {
  const currentX = currentRect.left + currentRect.width / 2
  const currentY = currentRect.top + currentRect.height / 2
  const candidateX = candidateRect.left + candidateRect.width / 2
  const candidateY = candidateRect.top + candidateRect.height / 2
  const deltaX = candidateX - currentX
  const deltaY = candidateY - currentY

  if (direction === 'left' && deltaX >= -4) return null
  if (direction === 'right' && deltaX <= 4) return null
  if (direction === 'up' && deltaY >= -4) return null
  if (direction === 'down' && deltaY <= 4) return null

  const primary = direction === 'left' || direction === 'right' ? Math.abs(deltaX) : Math.abs(deltaY)
  const secondary = direction === 'left' || direction === 'right' ? Math.abs(deltaY) : Math.abs(deltaX)
  return primary * 1000 + secondary
}

function moveFocus(direction) {
  const elements = getFocusableElements()
  if (elements.length === 0) {
    return
  }

  const current = ensureFocusedElement(elements)
  const currentRect = current.getBoundingClientRect()
  const next = elements
    .filter((element) => element !== current)
    .map((element) => ({
      element,
      score: getDirectionScore(currentRect, element.getBoundingClientRect(), direction)
    }))
    .filter((item) => item.score !== null)
    .sort((left, right) => left.score - right.score)[0]?.element

  if (next) {
    focusElement(next)
  }
}

function activateFocusedElement() {
  const active = document.activeElement
  if (active && active.classList.contains('tv-focusable')) {
    if (isEditableElement(active)) {
      active.focus()
      return
    }

    active.click()
  }
}

function submitCurrentFormAction() {
  const submitButton = Array.from(document.querySelectorAll('.primary-btn, button[type="submit"]')).find(isElementVisible)
  if (submitButton) {
    submitButton.click()
    return true
  }
  return false
}

function handleBack() {
  const closeButton = Array.from(document.querySelectorAll('.notice-close, .detail-close')).find(isElementVisible)
  if (closeButton) {
    closeButton.click()
    return
  }

  if (window.history.length > 1) {
    window.history.back()
  }
}

export function setupTvFocusNavigation() {
  if (!isBrowserRuntime()) {
    return () => {}
  }

  let tvEnabled = false

  function refreshMode() {
    tvEnabled = shouldEnableTvMode()
    markTvMode(tvEnabled)
    if (tvEnabled) {
      getFocusableElements()
    } else {
      clearCurrentFocus()
    }
  }

  function handleKeydown(event) {
    if (!tvEnabled) {
      return
    }

    const keyMap = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down'
    }
    const direction = keyMap[event.key]
    const targetIsEditable = isEditableElement(event.target)

    if (direction) {
      if (targetIsEditable && (direction === 'left' || direction === 'right')) {
        return
      }
      event.preventDefault()
      moveFocus(direction)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      if (targetIsEditable && event.key === 'Enter') {
        event.preventDefault()
        submitCurrentFormAction()
        return
      }
      if (targetIsEditable) {
        return
      }
      event.preventDefault()
      activateFocusedElement()
      return
    }

    if (event.key === 'Escape' || event.key === 'Backspace' || event.key === 'BrowserBack' || event.keyCode === 4) {
      event.preventDefault()
      handleBack()
    }
  }

  refreshMode()
  window.addEventListener('resize', refreshMode)
  window.addEventListener('orientationchange', refreshMode)
  document.addEventListener('keydown', handleKeydown)

  return () => {
    window.removeEventListener('resize', refreshMode)
    window.removeEventListener('orientationchange', refreshMode)
    document.removeEventListener('keydown', handleKeydown)
    markTvMode(false)
    clearCurrentFocus()
  }
}
