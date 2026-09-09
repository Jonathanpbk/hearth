import { useEffect, useRef, useState } from "react";
import { InteractiveCard } from "../InteractiveCard";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import {
  callService,
  setBrightness,
  setColorTemp,
  toggle,
  turnOff,
} from "../../lib/ha-service";
import { useEntityStore } from "../../store/useEntityStore";
import { getEntityBlockReason } from "../../lib/entity-state";
import { executeServiceAction } from "../../lib/service-action";
import { EntityFallbackCard, EntityStatusBadge } from "../EntityStatus";
import {
  LIGHT_DRAG_THRESHOLD_PX,
  LIGHT_HOLD_DURATION_MS,
  LIGHT_UPDATE_DEBOUNCE_MS,
  brightnessToPercent,
  isRgbLightColorMode,
  localColorOverrideToClear,
  pointerXToBrightness,
  resolveLightDisplayColor,
  type RgbColor,
} from "../../lib/light-controls";
import { LightControlsModal } from "./LightControlsModal";

interface Props {
  entityId: string;
  titleOverride?: string;
}

type GestureMode = "pressed" | "dragging" | "scrolling";

interface ActiveGesture {
  pointerId: number;
  startX: number;
  startY: number;
  mode: GestureMode;
  brightness: number;
}

function colorsMatch(left: RgbColor | null, right: RgbColor | undefined): boolean {
  return Boolean(
    left && right && left.every((channel, index) => channel === right[index])
  );
}

export function LightCard({ entityId, titleOverride }: Props) {
  const entity = useHAEntity(entityId);
  const connectionStatus = useEntityStore((state) => state.connectionStatus);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const [localColorTemp, setLocalColorTemp] = useState<number | null>(null);
  const [localRgb, setLocalRgb] = useState<RgbColor | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brightnessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorTempTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rgbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureRef = useRef<ActiveGesture | null>(null);
  const lastSentBrightnessRef = useRef<number | null>(null);
  const brightnessRequestRef = useRef(0);
  const colorTempRequestRef = useRef(0);
  const rgbRequestRef = useRef(0);
  const mountedRef = useRef(true);

  const blockReason = entity
    ? getEntityBlockReason(entity, connectionStatus)
    : connectionStatus === "connected"
      ? null
      : "Disconnected";
  const attrs = entity?.attributes ?? {};
  const isOn = entity?.state === "on";
  const brightness = attrs.brightness as number | undefined;
  const minKelvin = (attrs.min_color_temp_kelvin as number | undefined) ?? 2000;
  const maxKelvin = (attrs.max_color_temp_kelvin as number | undefined) ?? 6500;
  const colorTempKelvin = attrs.color_temp_kelvin as number | undefined;
  const colorMode = attrs.color_mode as string | undefined;
  const previousColorModeRef = useRef(colorMode);
  const supportedModes = (attrs.supported_color_modes as string[] | undefined) ?? [];
  const hasBrightness = supportedModes.some(
    (mode) => mode !== "onoff" && mode !== "unknown"
  );
  const hasColorTemp = supportedModes.includes("color_temp");
  const hasRgb = supportedModes.some((mode) => isRgbLightColorMode(mode));
  const entityRgb = attrs.rgb_color as RgbColor | undefined;
  const displayBrightness =
    localBrightness ?? brightness ?? (isOn && hasBrightness ? 255 : 0);
  const brightnessPercent = brightnessToPercent(displayBrightness);
  const displayColorTemp =
    localColorTemp ?? colorTempKelvin ?? Math.round((minKelvin + maxKelvin) / 2);
  const displayRgb = resolveLightDisplayColor({
    localColorTemp,
    localRgb,
    colorMode,
    entityRgb,
    colorTemp: displayColorTemp,
    minKelvin,
    maxKelvin,
  });
  const visuallyOn = localBrightness !== null ? localBrightness > 0 : isOn;
  const name =
    titleOverride ??
    (attrs.friendly_name as string | undefined) ??
    entityId;

  function clearHold() {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    setHolding(false);
  }

  function cancelGesture() {
    clearHold();
    gestureRef.current = null;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (brightnessTimerRef.current) clearTimeout(brightnessTimerRef.current);
      if (colorTempTimerRef.current) clearTimeout(colorTempTimerRef.current);
      if (rgbTimerRef.current) clearTimeout(rgbTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!blockReason) return;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    gestureRef.current = null;
    setHolding(false);
    setLocalBrightness(null);
    setLocalColorTemp(null);
    setLocalRgb(null);
  }, [blockReason]);

  useEffect(() => {
    lastSentBrightnessRef.current = null;
    setLocalBrightness((current) => {
      if (current === null) return current;
      if (current === 0 && !isOn) return null;
      return brightness !== undefined && Math.abs(current - brightness) <= 1
        ? null
        : current;
    });
  }, [brightness, isOn]);

  useEffect(() => {
    setLocalColorTemp((current) =>
      current !== null && current === colorTempKelvin ? null : current
    );
  }, [colorTempKelvin]);

  useEffect(() => {
    setLocalRgb((current) => (colorsMatch(current, entityRgb) ? null : current));
  }, [entityRgb]);

  useEffect(() => {
    const previousColorMode = previousColorModeRef.current;
    previousColorModeRef.current = colorMode;
    const overrideToClear = localColorOverrideToClear(previousColorMode, colorMode);

    if (overrideToClear === "rgb") {
      rgbRequestRef.current += 1;
      if (rgbTimerRef.current) clearTimeout(rgbTimerRef.current);
      rgbTimerRef.current = null;
      setLocalRgb(null);
      return;
    }

    if (overrideToClear === "color_temp") {
      colorTempRequestRef.current += 1;
      if (colorTempTimerRef.current) clearTimeout(colorTempTimerRef.current);
      colorTempTimerRef.current = null;
      setLocalColorTemp(null);
    }
  }, [colorMode]);

  if (!entity) {
    return (
      <EntityFallbackCard
        entityId={entityId}
        titleOverride={titleOverride}
        connectionStatus={connectionStatus}
      />
    );
  }

  function handleToggle() {
    if (blockReason) return;
    void executeServiceAction(`Toggle ${name}`, () =>
      toggle(getConnection(), entityId)
    );
  }

  async function sendBrightness(value: number) {
    if (blockReason || lastSentBrightnessRef.current === value) return;
    lastSentBrightnessRef.current = value;
    const requestId = ++brightnessRequestRef.current;
    const succeeded = await executeServiceAction(
      `Set ${name} brightness`,
      () =>
        value === 0
          ? turnOff(getConnection(), entityId)
          : setBrightness(getConnection(), entityId, value)
    );
    if (!succeeded && mountedRef.current && requestId === brightnessRequestRef.current) {
      lastSentBrightnessRef.current = null;
      setLocalBrightness(null);
    }
  }

  function scheduleBrightness(value: number) {
    if (blockReason) return;
    setLocalBrightness(value);
    if (brightnessTimerRef.current) clearTimeout(brightnessTimerRef.current);
    brightnessTimerRef.current = setTimeout(() => {
      brightnessTimerRef.current = null;
      void sendBrightness(value);
    }, LIGHT_UPDATE_DEBOUNCE_MS);
  }

  function commitBrightness(value: number) {
    if (brightnessTimerRef.current) clearTimeout(brightnessTimerRef.current);
    brightnessTimerRef.current = null;
    setLocalBrightness(value);
    void sendBrightness(value);
  }

  function handleColorTemp(value: number) {
    if (blockReason) return;
    const requestId = ++colorTempRequestRef.current;
    rgbRequestRef.current += 1;
    if (rgbTimerRef.current) clearTimeout(rgbTimerRef.current);
    rgbTimerRef.current = null;
    setLocalRgb(null);
    setLocalColorTemp(value);
    if (!isOn && localBrightness === null) {
      setLocalBrightness(brightness ?? 255);
    }
    if (colorTempTimerRef.current) clearTimeout(colorTempTimerRef.current);
    colorTempTimerRef.current = setTimeout(() => {
      void executeServiceAction(`Set ${name} colour temperature`, () =>
        setColorTemp(getConnection(), entityId, value)
      ).then((succeeded) => {
        if (!succeeded && mountedRef.current && requestId === colorTempRequestRef.current) {
          setLocalColorTemp(null);
        }
      });
    }, LIGHT_UPDATE_DEBOUNCE_MS);
  }

  function handleRgb(value: RgbColor) {
    if (blockReason) return;
    const requestId = ++rgbRequestRef.current;
    colorTempRequestRef.current += 1;
    if (colorTempTimerRef.current) clearTimeout(colorTempTimerRef.current);
    colorTempTimerRef.current = null;
    setLocalColorTemp(null);
    setLocalRgb(value);
    if (!isOn && localBrightness === null) {
      setLocalBrightness(brightness ?? 255);
    }
    if (rgbTimerRef.current) clearTimeout(rgbTimerRef.current);
    rgbTimerRef.current = setTimeout(() => {
      void executeServiceAction(`Set ${name} colour`, () =>
        callService(getConnection(), "light", "turn_on", {
          entity_id: entityId,
          rgb_color: value,
        })
      ).then((succeeded) => {
        if (!succeeded && mountedRef.current && requestId === rgbRequestRef.current) {
          setLocalRgb(null);
        }
      });
    }, LIGHT_UPDATE_DEBOUNCE_MS);
  }

  function brightnessAtPointer(event: React.PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    return pointerXToBrightness(event.clientX, rect.left, rect.width);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (
      blockReason ||
      gestureRef.current ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      mode: "pressed",
      brightness: brightnessAtPointer(event),
    };
    setHolding(true);
    holdTimerRef.current = setTimeout(() => {
      if (gestureRef.current?.mode !== "pressed") return;
      gestureRef.current = null;
      setHolding(false);
      setControlsOpen(true);
    }, LIGHT_HOLD_DURATION_MS);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (gesture.mode === "pressed") {
      if (
        Math.abs(deltaY) > LIGHT_DRAG_THRESHOLD_PX &&
        Math.abs(deltaY) > Math.abs(deltaX)
      ) {
        gesture.mode = "scrolling";
        clearHold();
        return;
      }
      if (Math.abs(deltaX) > LIGHT_DRAG_THRESHOLD_PX) {
        clearHold();
        if (!hasBrightness) {
          gesture.mode = "scrolling";
          return;
        }
        gesture.mode = "dragging";
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (gesture.mode !== "dragging") return;
    event.preventDefault();
    const value = brightnessAtPointer(event);
    gesture.brightness = value;
    scheduleBrightness(value);
  }

  function finishGesture(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    clearHold();

    if (gesture.mode === "pressed") handleToggle();
    if (gesture.mode === "dragging") {
      event.preventDefault();
      commitBrightness(gesture.brightness);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }

  const fillOpacity = visuallyOn ? 0.2 + (brightnessPercent / 100) * 0.5 : 0;
  const fillStyle: React.CSSProperties = {
    width: visuallyOn ? `${brightnessPercent}%` : "0%",
    backgroundColor: `rgb(${displayRgb.join(", ")})`,
    opacity: fillOpacity,
  };

  return (
    <>
      <InteractiveCard interactionDisabled={Boolean(blockReason)} className="h-full">
        <div
          role="button"
          tabIndex={blockReason ? -1 : 0}
          aria-disabled={Boolean(blockReason)}
          aria-label={`${name}, ${visuallyOn ? `${brightnessPercent}%` : "off"}`}
          aria-keyshortcuts="Enter Space ArrowDown"
          data-light-card={entityId}
          className={`relative h-full overflow-hidden rounded-2xl border bg-[var(--color-surface)] select-none ${
            visuallyOn ? "border-white/[0.12]" : "border-white/[0.06]"
          } ${blockReason ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          style={{ touchAction: "pan-y" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishGesture}
          onPointerCancel={cancelGesture}
          onContextMenu={(event) => event.preventDefault()}
          onClick={(event) => {
            if (event.detail === 0) handleToggle();
          }}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
              event.preventDefault();
              handleToggle();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setControlsOpen(true);
            }
          }}
        >
          <EntityStatusBadge reason={blockReason} />
          <div
            data-light-brightness-fill
            className="absolute inset-y-0 left-0 pointer-events-none transition-[width,background-color,opacity] duration-150"
            style={fillStyle}
          />
          <div
            data-light-hold-progress
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 z-20 h-1 origin-left bg-[#ffc174]"
            data-active={holding ? "true" : "false"}
            style={{
              transform: holding ? "scaleX(1)" : "scaleX(0)",
              transitionProperty: "transform",
              transitionDuration: holding ? `${LIGHT_HOLD_DURATION_MS}ms` : "0ms",
              transitionTimingFunction: "linear",
            }}
          />

          <div className="relative z-10 h-full p-2">
            <p className={`truncate text-[10px] font-medium uppercase leading-none tracking-widest text-white/45 ${blockReason ? "pr-24" : ""}`}>
              {name}
            </p>
          </div>
        </div>
      </InteractiveCard>

      {controlsOpen && (
        <LightControlsModal
          name={name}
          entityId={entityId}
          brightness={displayBrightness}
          colorTemp={displayColorTemp}
          minKelvin={minKelvin}
          maxKelvin={maxKelvin}
          rgbColor={displayRgb}
          hasBrightness={hasBrightness}
          hasColorTemp={hasColorTemp}
          hasRgb={hasRgb}
          preferTemperature={colorMode === "color_temp"}
          disabled={Boolean(blockReason)}
          onBrightnessChange={scheduleBrightness}
          onBrightnessCommit={commitBrightness}
          onColorTempChange={handleColorTemp}
          onRgbChange={handleRgb}
          onClose={() => setControlsOpen(false)}
        />
      )}
    </>
  );
}
