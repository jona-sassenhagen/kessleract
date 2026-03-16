import { DEBRIS_MODES, POINTER_TAP_SLOP } from "../config.js";
import { dom } from "./dom.js";
import { gameStore } from "../core/store.js";
import { distanceSquared } from "../core/math.js";
import { soundtrack } from "../audio.js";
import {
  canAdvanceFromRunEnd,
} from "../state.js";
import {
  canvasPointFromEvent,
  clearHoveredSatellite,
  updateHoveredSatellite,
} from "../render.js";

export function bindMobileHudButton(button, handler) {
  if (!button) {
    return;
  }

  const wrappedHandler = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    handler();
  };

  button.addEventListener("click", wrappedHandler);
  button.addEventListener("touchstart", wrappedHandler, { passive: false });
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
}

export function bindInputs(actions) {
  const {
    advanceLevel,
    clearTrackedSatellite,
    clearTrackingAndSetAngle,
    fireRocket,
    refreshPrediction,
    restartRun,
    scheduleViewportRefresh,
    setAngleValue,
    startGame,
    syncHud,
    togglePause,
    trackSatelliteAtPoint,
  } = actions;

  dom.startButton.addEventListener("click", () => {
    startGame();
  });

  dom.angleInput.addEventListener("input", () => {
    clearTrackedSatellite();
    setAngleValue(Number(dom.angleInput.value));
    refreshPrediction();
    syncHud();
  });

  dom.simulationSpeedInput.addEventListener("input", syncHud);

  window.addEventListener("resize", scheduleViewportRefresh, { passive: true });
  window.addEventListener("orientationchange", scheduleViewportRefresh, { passive: true });
  window.addEventListener("pageshow", scheduleViewportRefresh, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleViewportRefresh, { passive: true });
    window.visualViewport.addEventListener("scroll", scheduleViewportRefresh, { passive: true });
  }

  dom.canvas.addEventListener("pointermove", (event) => {
    const pointer = canvasPointFromEvent(event);
    if (event.pointerType === "mouse") {
      updateHoveredSatellite(pointer);
    } else if (gameStore.activeCanvasPointer && gameStore.activeCanvasPointer.id === event.pointerId) {
      gameStore.activeCanvasPointer.moved =
        gameStore.activeCanvasPointer.moved ||
        distanceSquared(gameStore.activeCanvasPointer.startPoint, pointer) > POINTER_TAP_SLOP * POINTER_TAP_SLOP;
    }
  });

  dom.canvas.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") {
      clearHoveredSatellite();
    }
  });

  dom.canvas.addEventListener("pointerdown", (event) => {
    gameStore.activeCanvasPointer = {
      id: event.pointerId,
      pointerType: event.pointerType,
      startPoint: canvasPointFromEvent(event),
      moved: false,
    };
    if (event.pointerType !== "mouse") {
      clearHoveredSatellite();
      if (typeof dom.canvas.setPointerCapture === "function") {
        try {
          dom.canvas.setPointerCapture(event.pointerId);
        } catch (_error) {
          // iOS Safari can be inconsistent here; tap-to-select should still work without capture.
        }
      }
    }
  });

  dom.canvas.addEventListener("pointerup", (event) => {
    if (canAdvanceFromRunEnd()) {
      advanceLevel();
      return;
    }

    const pointer = canvasPointFromEvent(event);
    if (event.pointerType === "mouse") {
      trackSatelliteAtPoint(pointer);
      return;
    }
    if (!gameStore.activeCanvasPointer || gameStore.activeCanvasPointer.id !== event.pointerId) {
      return;
    }

    const moved =
      gameStore.activeCanvasPointer.moved ||
      distanceSquared(gameStore.activeCanvasPointer.startPoint, pointer) > POINTER_TAP_SLOP * POINTER_TAP_SLOP;
    gameStore.activeCanvasPointer = null;
    if (typeof dom.canvas.hasPointerCapture === "function" && dom.canvas.hasPointerCapture(event.pointerId)) {
      dom.canvas.releasePointerCapture(event.pointerId);
    }
    if (!moved) {
      trackSatelliteAtPoint(pointer);
    }
  });

  dom.canvas.addEventListener("pointercancel", (event) => {
    if (gameStore.activeCanvasPointer && gameStore.activeCanvasPointer.id === event.pointerId) {
      gameStore.activeCanvasPointer = null;
    }
    if (typeof dom.canvas.hasPointerCapture === "function" && dom.canvas.hasPointerCapture(event.pointerId)) {
      dom.canvas.releasePointerCapture(event.pointerId);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (dom.startScreen && !dom.startScreen.hidden) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startGame();
      }
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      clearTrackingAndSetAngle(Number(dom.angleInput.value) + 1);
      refreshPrediction();
      syncHud();
    } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      clearTrackingAndSetAngle(Number(dom.angleInput.value) - 1);
      refreshPrediction();
      syncHud();
    } else if (event.key === " ") {
      event.preventDefault();
      togglePause();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (canAdvanceFromRunEnd()) {
        advanceLevel();
      } else {
        fireRocket();
      }
    } else if (event.key.toLowerCase() === "p") {
      togglePause();
    } else if (event.key.toLowerCase() === "r") {
      restartRun();
    } else if (event.key.toLowerCase() === "n") {
      advanceLevel();
    }
  });

  dom.pauseButton.addEventListener("click", togglePause);
  dom.fireButton.addEventListener("click", fireRocket);
  bindMobileHudButton(dom.mobileAngleDecrease, () => {
    clearTrackingAndSetAngle(Number(dom.angleInput.value) - 1);
    refreshPrediction();
    syncHud();
  });
  bindMobileHudButton(dom.mobileAngleIncrease, () => {
    clearTrackingAndSetAngle(Number(dom.angleInput.value) + 1);
    refreshPrediction();
    syncHud();
  });
  bindMobileHudButton(dom.mobilePauseButton, togglePause);
  bindMobileHudButton(dom.mobileFireButton, () => {
    fireRocket();
    syncHud();
  });
  bindMobileHudButton(dom.mobileResetButton, restartRun);

  dom.stopTrackingButton.addEventListener("click", () => {
    clearTrackedSatellite();
    refreshPrediction();
    syncHud();
  });
  dom.restartButton.addEventListener("click", restartRun);
  dom.nextLevelButton.addEventListener("click", advanceLevel);
  dom.debrisModeButton.addEventListener("click", () => {
    gameStore.debrisMode =
      gameStore.debrisMode === DEBRIS_MODES.classic
        ? DEBRIS_MODES.ordered
        : DEBRIS_MODES.classic;
    refreshPrediction();
    syncHud();
  });
  dom.musicToggleButton.addEventListener("click", () => {
    soundtrack.toggleMuted();
    syncHud();
  });
  dom.musicNextButton.addEventListener("click", () => {
    soundtrack.nextTrack(true);
    syncHud();
  });
}
