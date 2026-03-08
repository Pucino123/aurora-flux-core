import { useCallback, useRef, useState } from "react";
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
  Code, Database, Star, Heart, Brain, LayoutTemplate, X
} from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";

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
  const { setNodes } = useReactFlow();
  const iconEntry = ICONS.find((i) => i.key === data.iconKey) || ICONS[0];
  const IconComp = iconEntry.icon;

  const updateLabel = (val: string) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: val } } : n))
    );
  };

  return (
    <div
      className="relative transition-all duration-200"
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
      {/* Handles */}
      <Handle type="target" position={Position.Top} style={{ background: data.iconColor, border: "none", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.iconColor, border: "none", width: 8, height: 8 }} />
      <Handle type="target" position={Position.Left} style={{ background: data.iconColor, border: "none", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: data.iconColor, border: "none", width: 8, height: 8 }} />

      {/* Icon badge */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 shrink-0"
        style={{ background: `${data.iconColor}20`, border: `1px solid ${data.iconColor}30` }}
      >
        <IconComp size={16} style={{ color: data.iconColor }} />
      </div>

      {/* Editable title */}
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

/* ─── Initial demo nodes ─── */
const INIT_NODES: Node[] = [
  { id: "1", type: "idea", position: { x: 250, y: 150 }, data: { label: "Landing Page", iconKey: "Layout", iconColor: "#14b8a6" } },
  { id: "2", type: "idea", position: { x: 550, y: 80 }, data: { label: "User Auth", iconKey: "Database", iconColor: "#3b82f6" } },
  { id: "3", type: "idea", position: { x: 550, y: 260 }, data: { label: "Dashboard", iconKey: "Zap", iconColor: "#6366f1" } },
  { id: "4", type: "idea", position: { x: 850, y: 150 }, data: { label: "Launch 🚀", iconKey: "Rocket", iconColor: "#8b5cf6" } },
];

const INIT_EDGES: Edge[] = [
  { id: "e1-2", source: "1", target: "2", type: "smoothstep", animated: true, style: { stroke: "#3b82f6", strokeWidth: 2 } },
  { id: "e1-3", source: "1", target: "3", type: "smoothstep", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
  { id: "e2-4", source: "2", target: "4", type: "smoothstep", animated: true, style: { stroke: "#8b5cf6", strokeWidth: 2 } },
  { id: "e3-4", source: "3", target: "4", type: "smoothstep", animated: true, style: { stroke: "#8b5cf6", strokeWidth: 2 } },
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

/* ─── Main canvas (inner, needs ReactFlow context) ─── */
const ThinkpadCanvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(INIT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INIT_EDGES);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const { screenToFlowPosition } = useReactFlow();
  const nodeIdRef = useRef(100);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: "smoothstep", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
          eds
        )
      ),
    [setEdges]
  );

  const addNode = (iconKey: string, iconColor: string) => {
    const id = String(++nodeIdRef.current);
    const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newNode: Node = {
      id,
      type: "idea",
      position: { x: pos.x - 90 + Math.random() * 60 - 30, y: pos.y - 50 + Math.random() * 60 - 30 },
      data: { label: "New Idea", iconKey, iconColor },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    toast("Canvas cleared.");
  };

  const saveCanvas = () => {
    const data = { nodes, edges };
    localStorage.setItem("thinkpad_canvas", JSON.stringify(data));
    toast.success("✨ Canvas saved locally!");
  };

  return (
    <div className="flex-1 relative h-full w-full" style={{ background: "#06080f" }}>
      <SEO title="Thinkpad" description="Node-based infinite canvas for ideas and connections." />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        style={{ background: "transparent" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.06)" gap={28} size={1} />
        <Controls
          style={{
            background: "rgba(15,18,30,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            gap: 0,
          }}
        />
        <MiniMap
          style={{
            background: "rgba(15,18,30,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
          }}
          nodeColor={(n) => {
            const icon = ICONS.find((i) => i.key === (n.data as IdeaNodeData).iconKey);
            return icon?.color ?? "#6366f1";
          }}
          maskColor="rgba(0,0,0,0.4)"
        />
      </ReactFlow>

      {/* Floating Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <AnimatePresence>
          {showIconPicker && (
            <IconPicker
              onPick={(key, color) => addNode(key, color)}
              onClose={() => setShowIconPicker(false)}
            />
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full"
          style={{
            background: "rgba(15,18,30,0.92)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}
        >
          {/* Add Idea Box */}
          <motion.button
            onClick={() => setShowIconPicker((p) => !p)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: showIconPicker ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.5)",
              color: "#a5b4fc",
            }}
          >
            <Plus size={14} />
            Add Idea Box
          </motion.button>

          {/* Save */}
          <motion.button
            onClick={saveCanvas}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <Save size={13} />
            Save
          </motion.button>

          {/* Clear */}
          <motion.button
            onClick={clearCanvas}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "rgba(239,68,68,0.7)",
            }}
          >
            <Trash2 size={13} />
            Clear
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

/* ─── Export wrapped in provider ─── */
const ThinkpadView = () => (
  <div className="flex flex-col flex-1 h-full min-h-screen" style={{ background: "#06080f" }}>
    <ReactFlowProvider>
      <ThinkpadCanvas />
    </ReactFlowProvider>
  </div>
);

export default ThinkpadView;
