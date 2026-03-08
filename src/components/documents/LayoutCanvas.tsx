/**
 * LayoutCanvas — Framer Motion free-drag entity canvas for creative templates.
 * Entities: rect | circle | textBox — draggable, resizable, colour-customisable.
 * Right-click context menu: Duplicate, Delete, Bring to Front, Send to Back.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ArrowUp, ArrowDown, Type, Square, Circle, Copy } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CanvasEntity {
  id: string;
  type: "rect" | "circle" | "textBox";
  position: { x: number; y: number };
  size: { w: number; h: number };
  style: { fill: string; stroke: string; strokeWidth: number; borderRadius: number; opacity: number };
  content: string;
  zIndex: number;
}

interface LayoutCanvasProps {
  entities: CanvasEntity[];
  onChange: (entities: CanvasEntity[]) => void;
  lightMode?: boolean;
}

// ── Colour palettes ───────────────────────────────────────────────────────────

const PALETTE = [
  "#ffffff", "#000000", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#0ea5e9",
  "#14b8a6", "#f59e0b", "#6366f1", "#10b981", "transparent",
];

// ── Utility ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// ── Right-click Context Menu ──────────────────────────────────────────────────

interface ContextMenuProps {
  x: number;
  y: number;
  entityId: string;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onBringFront: (id: string) => void;
  onSendBack: (id: string) => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x, y, entityId, onDuplicate, onDelete, onBringFront, onSendBack, onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items: { label: string; icon: React.ReactNode; action: () => void; danger?: boolean }[] = [
    {
      label: "Duplicate",
      icon: <Copy size={10} />,
      action: () => { onDuplicate(entityId); onClose(); },
    },
    {
      label: "Bring to Front",
      icon: <ArrowUp size={10} />,
      action: () => { onBringFront(entityId); onClose(); },
    },
    {
      label: "Send to Back",
      icon: <ArrowDown size={10} />,
      action: () => { onSendBack(entityId); onClose(); },
    },
    {
      label: "Delete",
      icon: <Trash2 size={10} />,
      action: () => { onDelete(entityId); onClose(); },
      danger: true,
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.88, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -6 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[99999] rounded-xl overflow-hidden flex flex-col py-1"
      style={{
        left: x,
        top: y,
        minWidth: 160,
        background: "rgba(10,6,28,0.98)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(28px)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(255,255,255,0.05)",
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i === items.length - 1 && (
            <div className="mx-2 my-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          )}
          <button
            onClick={item.action}
            className="flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium transition-colors text-left w-full"
            style={{
              color: item.danger ? "rgba(248,113,113,0.85)" : "rgba(255,255,255,0.7)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = item.danger
                ? "rgba(239,68,68,0.12)"
                : "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <span className="opacity-70">{item.icon}</span>
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </motion.div>
  );
};

// ── Style Toolbar ─────────────────────────────────────────────────────────────

interface StyleToolbarProps {
  entity: CanvasEntity;
  onUpdate: (id: string, patch: Partial<CanvasEntity>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onBringFront: (id: string) => void;
  onSendBack: (id: string) => void;
}

const StyleToolbar: React.FC<StyleToolbarProps> = ({ entity, onUpdate, onDelete, onDuplicate, onBringFront, onSendBack }) => {
  const [tab, setTab] = useState<"fill" | "stroke">("fill");

  const setStyle = (patch: Partial<CanvasEntity["style"]>) =>
    onUpdate(entity.id, { style: { ...entity.style, ...patch } });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ duration: 0.14 }}
      className="fixed z-[9999] rounded-xl flex flex-col gap-2 p-2.5 shadow-2xl"
      style={{
        top: 80,
        right: 16,
        minWidth: 240,
        background: "rgba(12,8,30,0.97)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(24px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(255,255,255,0.06)",
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Tab row */}
      <div className="flex items-center gap-1">
        {(["fill", "stroke"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-all ${
              tab === t ? "bg-white/15 text-white/90" : "text-white/35 hover:text-white/60"
            }`}
          >
            {t}
          </button>
        ))}
        {/* Opacity */}
        <input
          type="range" min={20} max={100} step={5}
          value={Math.round(entity.style.opacity * 100)}
          onChange={e => setStyle({ opacity: Number(e.target.value) / 100 })}
          className="w-16 h-1 accent-violet-400 ml-1"
          title="Opacity"
        />
        <span className="text-[8px] text-white/30 w-5">{Math.round(entity.style.opacity * 100)}%</span>
      </div>

      {/* Colour swatches */}
      <div className="flex flex-wrap gap-1 px-0.5">
        {PALETTE.map(col => (
          <button
            key={col}
            title={col}
            onClick={() => tab === "fill" ? setStyle({ fill: col }) : setStyle({ stroke: col })}
            className="w-4 h-4 rounded border transition-all hover:scale-110"
            style={{
              background: col === "transparent" ? "linear-gradient(135deg, #fff 45%, #f00 45%)" : col,
              borderColor: (tab === "fill" ? entity.style.fill : entity.style.stroke) === col
                ? "rgba(139,92,246,0.9)" : "rgba(255,255,255,0.2)",
              borderWidth: (tab === "fill" ? entity.style.fill : entity.style.stroke) === col ? 2 : 1,
            }}
          />
        ))}
        {/* Native colour input for custom colours */}
        <input
          type="color"
          value={tab === "fill" ? (entity.style.fill === "transparent" ? "#ffffff" : entity.style.fill) : entity.style.stroke}
          onChange={e => tab === "fill" ? setStyle({ fill: e.target.value }) : setStyle({ stroke: e.target.value })}
          className="w-4 h-4 rounded cursor-pointer border-0 p-0"
          title="Custom colour"
          style={{ background: "none" }}
        />
      </div>

      {/* Stroke width (when stroke tab) */}
      {tab === "stroke" && (
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-[9px] text-white/30">Width</span>
          <input
            type="range" min={0} max={8} step={1}
            value={entity.style.strokeWidth}
            onChange={e => setStyle({ strokeWidth: Number(e.target.value) })}
            className="flex-1 h-1 accent-violet-400"
          />
          <span className="text-[9px] text-white/40 w-3">{entity.style.strokeWidth}</span>
        </div>
      )}

      {/* Border radius (rect only) */}
      {entity.type === "rect" && (
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-[9px] text-white/30">Radius</span>
          <input
            type="range" min={0} max={50} step={2}
            value={entity.style.borderRadius}
            onChange={e => setStyle({ borderRadius: Number(e.target.value) })}
            className="flex-1 h-1 accent-violet-400"
          />
          <span className="text-[9px] text-white/40 w-4">{entity.style.borderRadius}</span>
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-1 border-t border-white/[0.07] pt-1.5 mt-0.5">
        <button
          onClick={() => onDuplicate(entity.id)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
          title="Duplicate"
        >
          <Copy size={8} /> Copy
        </button>
        <button
          onClick={() => onBringFront(entity.id)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
          title="Bring to Front"
        >
          <ArrowUp size={8} /> Front
        </button>
        <button
          onClick={() => onSendBack(entity.id)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
          title="Send to Back"
        >
          <ArrowDown size={8} /> Back
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onDelete(entity.id)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] text-rose-400/60 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
          title="Delete"
        >
          <Trash2 size={8} /> Delete
        </button>
      </div>
    </motion.div>
  );
};

// ── Draggable Entity ──────────────────────────────────────────────────────────

interface EntityNodeProps {
  entity: CanvasEntity;
  isSelected: boolean;
  canvasRef: React.RefObject<HTMLDivElement>;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onResizeEnd: (id: string, dw: number, dh: number) => void;
  onContentChange: (id: string, content: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
}

const EntityNode: React.FC<EntityNodeProps> = ({
  entity, isSelected, canvasRef, onSelect, onDragEnd, onResizeEnd, onContentChange, onContextMenu,
}) => {
  const { type, position, size, style, content, zIndex } = entity;
  const resizeStart = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeStart.current) return;
      const dw = ev.clientX - resizeStart.current.mx;
      const dh = ev.clientY - resizeStart.current.my;
      onResizeEnd(entity.id, dw, dh);
    };
    const onUp = () => {
      resizeStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const shapeStyle: React.CSSProperties = {
    width:          size.w,
    height:         size.h,
    background:     style.fill === "transparent" ? "transparent" : style.fill,
    border:         style.strokeWidth > 0 ? `${style.strokeWidth}px solid ${style.stroke}` : "none",
    borderRadius:   type === "circle" ? "50%" : `${style.borderRadius}px`,
    opacity:        style.opacity,
    outline:        isSelected ? "2.5px solid rgba(99,102,241,0.9)" : "none",
    outlineOffset:  3,
    boxShadow:      isSelected ? "0 0 0 5px rgba(99,102,241,0.18), 0 8px 24px rgba(0,0,0,0.3)" : undefined,
    overflow:       "hidden",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.05}
      dragConstraints={canvasRef}
      initial={{ x: position.x, y: position.y }}
      animate={{ x: position.x, y: position.y }}
      onDragStart={() => { didDrag.current = false; }}
      onDrag={() => { didDrag.current = true; }}
      onDragEnd={(_, info) => {
        const canvas = canvasRef.current?.getBoundingClientRect();
        if (!canvas) return;
        const nx = clamp(position.x + info.offset.x, 0, canvas.width - size.w);
        const ny = clamp(position.y + info.offset.y, 0, canvas.height - size.h);
        onDragEnd(entity.id, nx, ny);
      }}
      onPointerDown={e => {
        e.stopPropagation();
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
        didDrag.current = false;
      }}
      onPointerUp={e => {
        e.stopPropagation();
        if (!didDrag.current) {
          onSelect(entity.id);
        }
        pointerDownPos.current = null;
      }}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, entity.id);
      }}
      className="absolute cursor-move touch-none"
      style={{ zIndex, position: "absolute", left: position.x, top: position.y, willChange: "transform" }}
    >
      <div style={shapeStyle}>
        {type === "textBox" && (
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={e => onContentChange(entity.id, (e.target as HTMLDivElement).innerText)}
            onMouseDown={e => e.stopPropagation()}
            className="w-full h-full p-2 outline-none text-sm leading-snug cursor-text"
            style={{ color: style.stroke || "#ffffff", fontSize: 13 }}
          >
            {content || "Double-click to edit"}
          </div>
        )}
      </div>

      {/* Resize handle — bottom-right corner */}
      {isSelected && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-[-4px] right-[-4px] w-3 h-3 rounded-full cursor-se-resize z-10"
          style={{ background: "rgba(139,92,246,0.9)", border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}
        />
      )}
    </motion.div>
  );
};

// ── Add Entity Toolbar ────────────────────────────────────────────────────────

interface AddToolbarProps {
  onAdd: (type: CanvasEntity["type"]) => void;
}

const AddToolbar: React.FC<AddToolbarProps> = ({ onAdd }) => (
  <div
    className="absolute top-3 right-3 z-[500] flex items-center gap-1 px-2 py-1.5 rounded-xl"
    style={{ background: "rgba(12,8,30,0.9)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}
  >
    <span className="text-[9px] text-white/30 uppercase tracking-wider mr-1">Add</span>
    {([
      { type: "rect"    as const, icon: Square, label: "Rectangle" },
      { type: "circle"  as const, icon: Circle, label: "Circle"    },
      { type: "textBox" as const, icon: Type,   label: "Text"      },
    ]).map(({ type, icon: Icon, label }) => (
      <button
        key={type}
        title={label}
        onClick={() => onAdd(type)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white/50 hover:text-white/90 hover:bg-white/10 transition-all"
      >
        <Icon size={10} />
        {label}
      </button>
    ))}
  </div>
);

// ── Main Canvas ───────────────────────────────────────────────────────────────

const LayoutCanvas: React.FC<LayoutCanvasProps> = ({ entities, onChange, lightMode = false }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entityId: string } | null>(null);

  const selected = entities.find(e => e.id === selectedId) ?? null;

  const update = useCallback((id: string, patch: Partial<CanvasEntity>) => {
    onChange(entities.map(e => e.id === id ? { ...e, ...patch } : e));
  }, [entities, onChange]);

  const handleDragEnd = (id: string, x: number, y: number) => {
    update(id, { position: { x, y } });
  };

  const handleResizeEnd = (id: string, dw: number, dh: number) => {
    const entity = entities.find(e => e.id === id);
    if (!entity) return;
    update(id, {
      size: {
        w: clamp(entity.size.w + dw, 30, 800),
        h: clamp(entity.size.h + dh, 30, 800),
      },
    });
  };

  const handleContentChange = (id: string, content: string) => {
    update(id, { content });
  };

  const handleAdd = (type: CanvasEntity["type"]) => {
    const id = crypto.randomUUID();
    const canvas = canvasRef.current?.getBoundingClientRect();
    const cx = canvas ? (canvas.width  / 2 - 60) : 160;
    const cy = canvas ? (canvas.height / 2 - 40) : 200;
    const defaults: Partial<Record<CanvasEntity["type"], Partial<CanvasEntity>>> = {
      rect:    { size: { w: 160, h: 80  }, style: { fill: "#6366f1", stroke: "#4f46e5", strokeWidth: 0, borderRadius: 8, opacity: 1 } },
      circle:  { size: { w: 100, h: 100 }, style: { fill: "#22c55e", stroke: "#16a34a", strokeWidth: 0, borderRadius: 50, opacity: 1 } },
      textBox: { size: { w: 180, h: 60  }, style: { fill: "transparent", stroke: "#ffffff", strokeWidth: 1, borderRadius: 4, opacity: 1 } },
    };
    const entity: CanvasEntity = {
      id, type,
      position: { x: cx, y: cy },
      content: type === "textBox" ? "Text label" : "",
      zIndex: entities.length + 1,
      ...defaults[type],
    } as CanvasEntity;
    onChange([...entities, entity]);
    setSelectedId(id);
  };

  const handleDelete = useCallback((id: string) => {
    onChange(entities.filter(e => e.id !== id));
    setSelectedId(null);
  }, [entities, onChange]);

  const handleDuplicate = useCallback((id: string) => {
    const entity = entities.find(e => e.id === id);
    if (!entity) return;
    const newEntity: CanvasEntity = {
      ...entity,
      id: crypto.randomUUID(),
      position: { x: entity.position.x + 20, y: entity.position.y + 20 },
      zIndex: Math.max(...entities.map(e => e.zIndex), 0) + 1,
    };
    onChange([...entities, newEntity]);
    setSelectedId(newEntity.id);
  }, [entities, onChange]);

  const handleBringFront = useCallback((id: string) => {
    const maxZ = Math.max(...entities.map(e => e.zIndex), 0);
    update(id, { zIndex: maxZ + 1 });
  }, [entities, update]);

  const handleSendBack = useCallback((id: string) => {
    const minZ = Math.min(...entities.map(e => e.zIndex), 1);
    update(id, { zIndex: Math.max(1, minZ - 1) });
  }, [entities, update]);

  const handleContextMenu = useCallback((e: React.MouseEvent, entityId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entityId });
    setSelectedId(entityId);
  }, []);

  // Dismiss context menu on canvas right-click
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu(null);
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full"
      style={{ minHeight: "29.7cm", background: lightMode ? "#ffffff" : "hsl(var(--card))" }}
      onClick={() => { setSelectedId(null); setContextMenu(null); }}
      onContextMenu={handleCanvasContextMenu}
    >
      {/* Add toolbar */}
      <AddToolbar onAdd={handleAdd} />

      {/* Entities */}
      {entities.map(entity => (
        <EntityNode
          key={entity.id}
          entity={entity}
          isSelected={selectedId === entity.id}
          canvasRef={canvasRef}
          onSelect={setSelectedId}
          onDragEnd={handleDragEnd}
          onResizeEnd={handleResizeEnd}
          onContentChange={handleContentChange}
          onContextMenu={handleContextMenu}
        />
      ))}

      {/* Style toolbar for selected entity */}
      <AnimatePresence>
        {selected && (
          <StyleToolbar
            entity={selected}
            onUpdate={update}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onBringFront={handleBringFront}
            onSendBack={handleSendBack}
          />
        )}
      </AnimatePresence>

      {/* Right-click context menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            key="ctx-menu"
            x={contextMenu.x}
            y={contextMenu.y}
            entityId={contextMenu.entityId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onBringFront={handleBringFront}
            onSendBack={handleSendBack}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* Empty state */}
      {entities.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <p className="text-[13px] text-muted-foreground/30 font-medium">Layout Canvas</p>
          <p className="text-[11px] text-muted-foreground/20">Use the toolbar above to add shapes and text boxes</p>
          <p className="text-[10px] text-muted-foreground/15 mt-1">Right-click any element for quick actions</p>
        </div>
      )}
    </div>
  );
};

export default LayoutCanvas;
