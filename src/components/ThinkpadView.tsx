import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Save, Lightbulb, Zap, Target, Rocket,
  Code, Database, Star, Heart, Brain, LayoutTemplate, X, Pencil, Check, Sun, Moon,
  ZoomIn, ZoomOut, Bookmark, Lock, Unlock, Maximize2
} from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { useTheme } from "next-themes";

/* ─── Types ─── */
interface IdeaTrack {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

/* ─── Icon palette ─── */
const ICONS = [
  { key: "Lightbulb", icon: Lightbulb, color: "#f59e0b" },
  { key: "Zap", icon: Zap, color: "#6366f1" },
  { key: "Target", icon: Target, color: "#ef4444" },
  { key: "Rocket", icon: Rocket, color: "#8b5cf6" },
  { key: "Code", icon: Code, color: "#22c55e" },
  { key: "Database", icon: Database, color: "#3b82f6" },
  { key: "Star", icon: Star, color: "#f59e0b" },
  { key: "Heart", icon: Heart, color: "#ec4899" },
  { key: "Brain", icon: Brain, color: "#a855f7" },
  { key: "Layout", icon: LayoutTemplate, color: "#14b8a6" },
];

/* ─── Custom Node ─── */
interface IdeaNodeData {
  label: string;
  iconKey: string;
  iconColor: string;
  [key: string]: unknown;
}

const IdeaNode = ({ id, data, selected }: { id: string; data: IdeaNodeData; selected: boolean }) => {
  const { setNodes, deleteElements } = useReactFlow();
  const iconEntry = ICONS.find((i) => i.key === data.iconKey) || ICONS[0];
  const IconComp = iconEntry.icon;

  const updateLabel = (val: string) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: val } } : n))
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div
      className="group relative transition-all duration-200"
      style={{
        background: "rgba(15, 18, 30, 0.85)",
        backdropFilter: "blur(20px)",
        border: selected
          ? `1.5px solid ${data.iconColor}80`
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "16px",
        minWidth: "180px",
        maxWidth: "260px",
        boxShadow: selected
          ? `0 0 20px ${data.iconColor}30, 0 8px 32px rgba(0,0,0,0.4)`
          : "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      {/* Delete button — appears on hover */}
      <button
        onClick={handleDelete}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.35)", color: "rgba(239,68,68,0.85)" }}
        title="Delete node"
      >
        <X size={10} />
      </button>

      <Handle type="target" position={Position.Top} style={{ background: data.iconColor, border: "none", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.iconColor, border: "none", width: 8, height: 8 }} />
      <Handle type="target" position={Position.Left} style={{ background: data.iconColor, border: "none", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: data.iconColor, border: "none", width: 8, height: 8 }} />

      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 shrink-0"
        style={{ background: `${data.iconColor}20`, border: `1px solid ${data.iconColor}30` }}
      >
        <IconComp size={16} style={{ color: data.iconColor }} />
      </div>

      <input
        value={String(data.label)}
        onChange={(e) => updateLabel(e.target.value)}
        placeholder="Idea title…"
        className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-white/20"
        style={{ color: "rgba(255,255,255,0.9)" }}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
};

const nodeTypes = { idea: IdeaNode };

/* ─── Default demo nodes/edges per new track ─── */
const makeDefaultNodes = (): Node[] => [
  { id: "1", type: "idea", position: { x: 250, y: 150 }, data: { label: "Big Idea", iconKey: "Lightbulb", iconColor: "#f59e0b" } },
  { id: "2", type: "idea", position: { x: 550, y: 80 }, data: { label: "Research", iconKey: "Brain", iconColor: "#a855f7" } },
  { id: "3", type: "idea", position: { x: 550, y: 260 }, data: { label: "Action Plan", iconKey: "Target", iconColor: "#ef4444" } },
  { id: "4", type: "idea", position: { x: 850, y: 150 }, data: { label: "Launch 🚀", iconKey: "Rocket", iconColor: "#8b5cf6" } },
];
const makeDefaultEdges = (): Edge[] => [
  { id: "e1-2", source: "1", target: "2", type: "smoothstep", animated: true, style: { stroke: "#a855f7", strokeWidth: 2 } },
  { id: "e1-3", source: "1", target: "3", type: "smoothstep", animated: true, style: { stroke: "#ef4444", strokeWidth: 2 } },
  { id: "e2-4", source: "2", target: "4", type: "smoothstep", animated: true, style: { stroke: "#8b5cf6", strokeWidth: 2 } },
  { id: "e3-4", source: "3", target: "4", type: "smoothstep", animated: true, style: { stroke: "#8b5cf6", strokeWidth: 2 } },
];

const DEFAULT_TRACKS: IdeaTrack[] = [
  { id: "track-1", name: "Idea Track 1", nodes: makeDefaultNodes(), edges: makeDefaultEdges() },
];

/* ─── Icon picker ─── */
const IconPicker = ({ onPick, onClose }: { onPick: (key: string, color: string) => void; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 8 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, y: 8 }}
    className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[9999] rounded-2xl p-3 flex gap-2 flex-wrap justify-center"
    style={{ background: "rgba(15,18,30,0.96)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", width: 280 }}
  >
    <div className="w-full flex items-center justify-between mb-1 px-1">
      <span className="text-[11px] text-white/40 font-medium">Choose icon</span>
      <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"><X size={12} /></button>
    </div>
    {ICONS.map(({ key, icon: Icon, color }) => (
      <button
        key={key}
        onClick={() => { onPick(key, color); onClose(); }}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon size={16} style={{ color }} />
      </button>
    ))}
  </motion.div>
);

/* ─── Single canvas for active track ─── */
const IdeaCanvas = ({
  track,
  onSave,
}: {
  track: IdeaTrack;
  onSave: (nodes: Node[], edges: Edge[]) => void;
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(track.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(track.edges);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [markedNodes, setMarkedNodes] = useState<Set<string>>(new Set());
  const { screenToFlowPosition, zoomIn, zoomOut, setCenter, fitView } = useReactFlow();
  const nodeIdRef = useRef(200);

  // Sync when track changes
  useEffect(() => {
    setNodes(track.nodes);
    setEdges(track.edges);
  }, [track.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, type: "smoothstep", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  const addNode = (iconKey: string, iconColor: string) => {
    const id = String(++nodeIdRef.current);
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "idea",
        position: { x: pos.x - 90 + Math.random() * 60 - 30, y: pos.y - 50 + Math.random() * 60 - 30 },
        data: { label: "New Idea", iconKey, iconColor },
      },
    ]);
  };

  const handleSave = () => {
    onSave(nodes, edges);
    toast.success("✨ Track saved!");
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    toast("Canvas cleared.");
  };

  const toggleMarkSelected = () => {
    const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
    if (selectedIds.length === 0) { toast("Select nodes first to mark them."); return; }
    setMarkedNodes(prev => {
      const next = new Set(prev);
      selectedIds.forEach(id => next.has(id) ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const navigateToMarked = () => {
    const firstMarked = nodes.find(n => markedNodes.has(n.id));
    if (!firstMarked) { toast("No marked nodes."); return; }
    setCenter(firstMarked.position.x + 90, firstMarked.position.y + 50, { duration: 600, zoom: 1.2 });
  };

  return (
    <div className="flex-1 relative h-full w-full">
      <ReactFlow
        nodes={nodes.map(n => ({
          ...n,
          style: markedNodes.has(n.id)
            ? { ...((n.style as object) || {}), outline: "2px solid #3b82f6", outlineOffset: "3px" }
            : n.style,
        }))}
        edges={edges}
        onNodesChange={isLocked ? () => {} : onNodesChange}
        onEdgesChange={isLocked ? () => {} : onEdgesChange}
        onConnect={isLocked ? () => {} : onConnect}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
        deleteKeyCode={isLocked ? null : "Delete"}
        style={{ background: "transparent" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.06)" gap={28} size={1} />
        {/* Hide default Controls — we use our own toolbar */}
        <MiniMap
          style={{ background: "rgba(15,18,30,0.95)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "14px", cursor: "pointer" }}
          nodeColor={(n) => markedNodes.has(n.id) ? "#3b82f6" : (ICONS.find((i) => i.key === (n.data as IdeaNodeData).iconKey)?.color ?? "#6366f1")}
          maskColor="rgba(0,0,0,0.5)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Floating Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <AnimatePresence>
          {showIconPicker && (
            <IconPicker onPick={(key, color) => addNode(key, color)} onClose={() => setShowIconPicker(false)} />
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-full"
          style={{ background: "rgba(15,18,30,0.92)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
        >
          {/* Add node */}
          <motion.button
            onClick={() => setShowIconPicker((p) => !p)}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
            title="Add idea box"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ background: showIconPicker ? "rgba(59,130,246,0.4)" : "rgba(59,130,246,0.18)", border: "1px solid rgba(59,130,246,0.45)", color: "#93c5fd" }}
          >
            <Plus size={15} />
            <span className="text-xs font-bold">Add</span>
          </motion.button>

          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

          {/* Zoom in */}
          <motion.button
            onClick={() => zoomIn({ duration: 300 })}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
            title="Zoom in"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
          >
            <ZoomIn size={15} />
          </motion.button>

          {/* Zoom out */}
          <motion.button
            onClick={() => zoomOut({ duration: 300 })}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
            title="Zoom out"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
          >
            <ZoomOut size={15} />
          </motion.button>

          {/* Fit to view / home */}
          <motion.button
            onClick={() => fitView({ duration: 500, padding: 0.15 })}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
            title="Fit all nodes in view"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
          >
            <Maximize2 size={14} />
          </motion.button>

          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

          {/* Mark / bookmark */}
          <motion.button
            onClick={toggleMarkSelected}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
            title={markedNodes.size > 0 ? `${markedNodes.size} marked — click to go there` : "Mark selected nodes"}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all relative"
            style={{
              background: markedNodes.size > 0 ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.06)",
              border: markedNodes.size > 0 ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.1)",
              color: markedNodes.size > 0 ? "#60a5fa" : "rgba(255,255,255,0.7)"
            }}
          >
            <Bookmark size={15} fill={markedNodes.size > 0 ? "#60a5fa" : "none"} />
            {markedNodes.size > 0 && (
              <span className="absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "#3b82f6", color: "#fff" }}>
                {markedNodes.size}
              </span>
            )}
          </motion.button>

          {/* Navigate to marked */}
          {markedNodes.size > 0 && (
            <motion.button
              onClick={navigateToMarked}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
              title="Jump to marked node"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all"
              style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", color: "#93c5fd" }}
            >
              Go to mark
            </motion.button>
          )}

          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

          {/* Lock / unlock */}
          <motion.button
            onClick={() => { setIsLocked(l => !l); toast(isLocked ? "Canvas unlocked" : "Canvas locked — drag disabled"); }}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
            title={isLocked ? "Unlock canvas" : "Lock canvas (disable drag)"}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: isLocked ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.06)",
              border: isLocked ? "1px solid rgba(234,179,8,0.5)" : "1px solid rgba(255,255,255,0.1)",
              color: isLocked ? "#fbbf24" : "rgba(255,255,255,0.7)"
            }}
          >
            {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
          </motion.button>

          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />

          {/* Save */}
          <motion.button
            onClick={handleSave}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
            title="Save track"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "rgba(74,222,128,0.85)" }}
          >
            <Save size={15} />
          </motion.button>

          {/* Clear */}
          <motion.button
            onClick={clearCanvas}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
            title="Clear canvas"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.7)" }}
          >
            <Trash2 size={14} />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

/* ─── Tab bar ─── */
const TabBar = ({
  tracks,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onRename,
}: {
  tracks: IdeaTrack[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (track: IdeaTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(track.id);
    setEditValue(track.name);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) onRename(editingId, editValue.trim());
    setEditingId(null);
  };

  return (
    <div
      className="flex items-center gap-1 px-3 pt-3 pb-0 overflow-x-auto scrollbar-none shrink-0"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      {tracks.map((track) => {
        const isActive = track.id === activeId;
        return (
          <div
            key={track.id}
            onClick={() => onSelect(track.id)}
            className="group relative flex items-center gap-1.5 px-3 py-2 rounded-t-xl cursor-pointer shrink-0 transition-all duration-200"
            style={{
              background: isActive ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
              border: isActive ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.06)",
              borderBottom: isActive ? "1px solid transparent" : "1px solid rgba(255,255,255,0.06)",
              marginBottom: isActive ? "-1px" : 0,
            }}
          >
            {editingId === track.id ? (
              <>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                  className="bg-transparent text-xs font-medium outline-none w-24"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <button onClick={(e) => { e.stopPropagation(); commitEdit(); }} className="text-white/40 hover:text-white/80">
                  <Check size={10} />
                </button>
              </>
            ) : (
              <>
                <span
                  className="text-xs font-medium max-w-[120px] truncate"
                  style={{ color: isActive ? "rgba(165,180,252,1)" : "rgba(255,255,255,0.45)" }}
                >
                  {track.name}
                </span>
                {/* Edit on hover */}
                <button
                  onClick={(e) => startEdit(track, e)}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  <Pencil size={9} />
                </button>
                {/* Delete — only if more than 1 track */}
                {tracks.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(track.id); }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                    style={{ color: "rgba(239,68,68,0.7)" }}
                  >
                    <X size={9} />
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Add new track */}
      <button
        onClick={onAdd}
        className="flex items-center gap-1 px-2.5 py-2 rounded-t-xl text-xs transition-all hover:bg-white/8 shrink-0"
        style={{ color: "rgba(255,255,255,0.3)", border: "1px solid transparent" }}
      >
        <Plus size={11} /> New Track
      </button>
    </div>
  );
};

/* ─── Main view ─── */
const IdeapadView = () => {
  const STORAGE_KEY = "ideapad_tracks";
  const { theme, setTheme } = useTheme();

  const loadTracks = (): IdeaTrack[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_TRACKS;
  };

  const [tracks, setTracks] = useState<IdeaTrack[]>(loadTracks);
  const [activeId, setActiveId] = useState<string>(tracks[0]?.id ?? "track-1");

  const activeTrack = tracks.find((t) => t.id === activeId) ?? tracks[0];

  const persistTracks = (updated: IdeaTrack[]) => {
    setTracks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSave = (nodes: Node[], edges: Edge[]) => {
    persistTracks(tracks.map((t) => t.id === activeId ? { ...t, nodes, edges } : t));
  };

  const addTrack = () => {
    const id = `track-${Date.now()}`;
    const newTrack: IdeaTrack = {
      id,
      name: `Idea Track ${tracks.length + 1}`,
      nodes: makeDefaultNodes(),
      edges: makeDefaultEdges(),
    };
    const updated = [...tracks, newTrack];
    persistTracks(updated);
    setActiveId(id);
  };

  const deleteTrack = (id: string) => {
    const updated = tracks.filter((t) => t.id !== id);
    persistTracks(updated);
    if (activeId === id) setActiveId(updated[0]?.id ?? "");
  };

  const renameTrack = (id: string, name: string) => {
    persistTracks(tracks.map((t) => t.id === id ? { ...t, name } : t));
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen" style={{ background: "#06080f" }}>
      <SEO title="Ideapad" description="Multi-track infinite canvas for idea mapping." />

      {/* Tab bar with theme toggle */}
      <div className="flex items-center" style={{ background: "rgba(6,8,15,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex-1 overflow-x-auto">
          <TabBar
            tracks={tracks}
            activeId={activeId}
            onSelect={setActiveId}
            onAdd={addTrack}
            onDelete={deleteTrack}
            onRename={renameTrack}
          />
        </div>
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="shrink-0 mr-3 p-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.5)" }}
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlowProvider key={activeTrack?.id}>
          <IdeaCanvas track={activeTrack} onSave={handleSave} />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default IdeapadView;
