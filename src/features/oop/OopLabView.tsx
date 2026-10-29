import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Code,
  Shield,
  Layers,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  FileCode,
  Plus
} from 'lucide-react';
import {
  PolymorphismResultItem,
  OperatorOverloadResult,
  TemplatesResult,
  ClassRegistryItem
} from '../../types';

export const OopLabView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'architecture' | 'operators' | 'templates' | 'polymorphism' | 'encapsulation' | 'tests'>('operators');

  // Architecture registry
  const [classes, setClasses] = useState<ClassRegistryItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassRegistryItem | null>(null);

  // Operator Overloading State
  const [operatorBoard, setOperatorBoard] = useState('X.O......');
  const [operatorPos, setOperatorPos] = useState(1);
  const [operatorMark, setOperatorMark] = useState<'X' | 'O'>('X');
  const [operatorData, setOperatorData] = useState<OperatorOverloadResult | null>(null);
  const [operatorLoading, setOperatorLoading] = useState(false);

  // Templates State
  const [templatesData, setTemplatesData] = useState<TemplatesResult | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Polymorphism State
  const [polyBoard, setPolyBoard] = useState('X.O......');
  const [polyMark, setPolyMark] = useState<'X' | 'O'>('O');
  const [polyResults, setPolyResults] = useState<PolymorphismResultItem[]>([]);
  const [polyLoading, setPolyLoading] = useState(false);

  // Encapsulation State
  const [encapAction, setEncapAction] = useState('occupied_cell');
  const [encapBoard, setEncapBoard] = useState('X........');
  const [encapPos, setEncapPos] = useState(0);
  const [encapResult, setEncapResult] = useState<any>(null);
  const [encapLoading, setEncapLoading] = useState(false);

  // Unit Test State
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Initial Load
  useEffect(() => {
    loadClassRegistry();
    runOperatorsDemo('X.O......', 1, 'X');
    runTemplatesDemo();
    runPolymorphismDemo('X.O......', 'O');
    runEncapsulationDemo('occupied_cell', 'X........', 0, 'O');
  }, []);

  const loadClassRegistry = async () => {
    try {
      const res = await api.getClassRegistry();
      if (res && res.classes) {
        setClasses(res.classes);
        setSelectedClass(res.classes[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runOperatorsDemo = async (b = operatorBoard, pos = operatorPos, m = operatorMark) => {
    setOperatorLoading(true);
    try {
      const res = await api.getOperatorsDemo(b, pos, m);
      setOperatorData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setOperatorLoading(false);
    }
  };

  const runTemplatesDemo = async () => {
    setTemplatesLoading(true);
    try {
      const res = await api.getTemplatesDemo();
      setTemplatesData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const runPolymorphismDemo = async (b = polyBoard, m = polyMark) => {
    setPolyLoading(true);
    try {
      const res = await api.getPolymorphismDemo(b, m);
      if (res && res.polymorphismResults) {
        setPolyResults(res.polymorphismResults);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPolyLoading(false);
    }
  };

  const runEncapsulationDemo = async (action = encapAction, b = encapBoard, pos = encapPos, m = 'O') => {
    setEncapLoading(true);
    try {
      const res = await api.getEncapsulationDemo(action, b, pos, m);
      setEncapResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setEncapLoading(false);
    }
  };

  const handleRunTests = async () => {
    setTestLoading(true);
    try {
      const res = await api.runOopTests();
      setTestOutput(res.output || res.summary || 'Tests executed.');
      setTestSuccess(res.success);
    } catch (e: any) {
      setTestOutput('Test execution error: ' + e.message);
      setTestSuccess(false);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="surface-card rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#172231] border border-[#293748] text-xs font-mono text-[#D99A4E]">
              <Cpu className="w-3.5 h-3.5" />
              <span>Native C++ 17 Object-Oriented Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#DCE8F5]">
              C++ OOP Architecture Lab
            </h1>
            <p className="text-sm text-[#91B7CE] max-w-2xl leading-relaxed">
              Explore C++ 17 domain architecture, generic templates, operator overloading, virtual dispatch polymorphism, and invariant encapsulation.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunTests}
              disabled={testLoading}
              className="btn-amber-primary px-4 py-2.5 rounded-lg text-xs font-mono tracking-wide flex items-center space-x-2 cursor-pointer shadow-lg shadow-[#D99A4E]/20"
            >
              <Terminal className="w-4 h-4" />
              <span>{testLoading ? 'Running Test Suite...' : 'Run 34 Unit Tests'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-[#293748]">
        {[
          { id: 'operators', label: 'Operator Overloading', icon: Plus },
          { id: 'templates', label: 'C++ Templates', icon: FileCode },
          { id: 'polymorphism', label: 'Polymorphism (Bot AI)', icon: Layers },
          { id: 'encapsulation', label: 'Encapsulation & Invariants', icon: Shield },
          { id: 'architecture', label: 'Class Hierarchy', icon: Code },
          { id: 'tests', label: 'Unit Test Suite (34)', icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#172231] text-[#DCE8F5] border border-[#D99A4E]/60 shadow-sm'
                  : 'text-[#8795A7] hover:text-[#DCE8F5] hover:bg-[#111B2A]/70'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D99A4E]' : 'text-[#8795A7]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OPERATOR OVERLOADING SECTION */}
      {activeSection === 'operators' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Control Column */}
            <div className="surface-card rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-serif font-bold text-[#DCE8F5] flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#D99A4E]" />
                <span>Operator Overload Parameters</span>
              </h3>
              <p className="text-xs text-[#8795A7] leading-relaxed">
                Test C++ operator overloads on <code className="text-[#D99A4E]">Board</code> and <code className="text-[#D99A4E]">Move</code> structs.
              </p>

              <div>
                <label className="block text-xs font-mono text-[#8795A7] mb-1">Board State (9 chars)</label>
                <input
                  type="text"
                  maxLength={9}
                  value={operatorBoard}
                  onChange={(e) => setOperatorBoard(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] font-mono text-sm uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#8795A7] mb-1">Target Position (0-8)</label>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    value={operatorPos}
                    onChange={(e) => setOperatorPos(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#8795A7] mb-1">Move Mark</label>
                  <select
                    value={operatorMark}
                    onChange={(e) => setOperatorMark(e.target.value as 'X' | 'O')}
                    className="w-full px-3 py-2 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] font-mono text-sm cursor-pointer"
                  >
                    <option value="X">X</option>
                    <option value="O">O</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => runOperatorsDemo(operatorBoard, operatorPos, operatorMark)}
                disabled={operatorLoading}
                className="w-full btn-amber-primary py-2.5 rounded-lg text-xs font-mono flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{operatorLoading ? 'Evaluating C++...' : 'Invoke C++ Operators'}</span>
              </button>
            </div>

            {/* Results Display */}
            <div className="lg:col-span-2 space-y-4">
              {operatorData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* operator[] */}
                  <div className="surface-card rounded-xl p-4 space-y-2 border-l-4 border-l-[#D99A4E]">
                    <span className="text-[10px] font-mono uppercase text-[#D99A4E] block">Subscript Operator</span>
                    <code className="text-xs font-mono text-[#DCE8F5] block bg-[#080D16] p-2 rounded">
                      {operatorData.operators.subscript.signature}
                    </code>
                    <p className="text-xs text-[#8795A7]">{operatorData.operators.subscript.explanation}</p>
                    <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[#293748]">
                      <span className="text-[#8795A7]">b[{operatorData.operators.subscript.readIndex}] ==</span>
                      <span className="text-[#32C997] font-bold">'{operatorData.operators.subscript.readValue}'</span>
                    </div>
                  </div>

                  {/* operator== & operator!= */}
                  <div className="surface-card rounded-xl p-4 space-y-2 border-l-4 border-l-[#32C997]">
                    <span className="text-[10px] font-mono uppercase text-[#32C997] block">Equality Operators</span>
                    <code className="text-xs font-mono text-[#DCE8F5] block bg-[#080D16] p-2 rounded">
                      bool operator==(const Board&) const
                    </code>
                    <p className="text-xs text-[#8795A7]">{operatorData.operators.equality.explanation}</p>
                    <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[#293748]">
                      <span className="text-[#8795A7]">board == clone():</span>
                      <span className="text-[#32C997] font-bold">{operatorData.operators.equality.b1_equals_b2 ? 'TRUE' : 'FALSE'}</span>
                    </div>
                  </div>

                  {/* operator+ */}
                  <div className="surface-card rounded-xl p-4 space-y-2 border-l-4 border-l-[#91B7CE]">
                    <span className="text-[10px] font-mono uppercase text-[#91B7CE] block">Binary Addition (Immutable)</span>
                    <code className="text-xs font-mono text-[#DCE8F5] block bg-[#080D16] p-2 rounded">
                      {operatorData.operators.addition.signature}
                    </code>
                    <p className="text-xs text-[#8795A7]">{operatorData.operators.addition.explanation}</p>
                    <div className="space-y-1 text-xs font-mono pt-2 border-t border-[#293748]">
                      <div className="flex justify-between">
                        <span className="text-[#8795A7]">Result:</span>
                        <span className="text-[#DCE8F5]">{operatorData.operators.addition.resultBoard}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8795A7]">Original:</span>
                        <span className="text-[#91B7CE]">{operatorData.operators.addition.originalBoardUnchanged} (Unmutated)</span>
                      </div>
                    </div>
                  </div>

                  {/* operator<< */}
                  <div className="surface-card rounded-xl p-4 space-y-2 border-l-4 border-l-[#F16D78]">
                    <span className="text-[10px] font-mono uppercase text-[#F16D78] block">Stream Insertion Operator</span>
                    <code className="text-xs font-mono text-[#DCE8F5] block bg-[#080D16] p-2 rounded">
                      {operatorData.operators.streamInsertion.signature}
                    </code>
                    <p className="text-xs text-[#8795A7]">{operatorData.operators.streamInsertion.explanation}</p>
                    <pre className="text-xs font-mono bg-[#080D16] p-2 rounded text-[#DCE8F5] whitespace-pre-wrap">
                      {operatorData.operators.streamInsertion.formattedStream}
                    </pre>
                  </div>

                </div>
              ) : (
                <div className="surface-card rounded-2xl p-8 text-center text-xs font-mono text-[#8795A7]">
                  Loading operator overloading data...
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 2. TEMPLATES & GENERICS SECTION */}
      {activeSection === 'templates' && (
        <div className="space-y-6">
          {templatesData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Class Template Grid */}
              <div className="surface-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-[#D99A4E]">
                  <FileCode className="w-4 h-4" />
                  <span>Class Template: Grid&lt;T, N&gt;</span>
                </div>
                <code className="block bg-[#080D16] p-3 rounded-lg text-xs font-mono text-[#DCE8F5] border border-[#293748]">
                  {templatesData.templates.classTemplateGrid.declaration}
                </code>
                <p className="text-xs text-[#8795A7] leading-relaxed">
                  {templatesData.templates.classTemplateGrid.explanation}
                </p>
                <div className="bg-[#111B2A] p-3 rounded-lg border border-[#293748] space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">Instance 1:</span>
                    <span className="text-[#D99A4E]">{templatesData.templates.classTemplateGrid.instanceTypeCell}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">Instance 2:</span>
                    <span className="text-[#32C997]">{templatesData.templates.classTemplateGrid.instanceTypeInt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">Center Heuristic Weight:</span>
                    <span className="text-[#DCE8F5]">{templatesData.templates.classTemplateGrid.centerWeight}</span>
                  </div>
                </div>
              </div>

              {/* Class Template HistoryBuffer */}
              <div className="surface-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-[#32C997]">
                  <Layers className="w-4 h-4" />
                  <span>Class Template: HistoryBuffer&lt;T, Capacity&gt;</span>
                </div>
                <code className="block bg-[#080D16] p-3 rounded-lg text-xs font-mono text-[#DCE8F5] border border-[#293748]">
                  {templatesData.templates.classTemplateHistory.declaration}
                </code>
                <p className="text-xs text-[#8795A7] leading-relaxed">
                  {templatesData.templates.classTemplateHistory.explanation}
                </p>
                <div className="bg-[#111B2A] p-3 rounded-lg border border-[#293748] space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">Instance:</span>
                    <span className="text-[#32C997]">{templatesData.templates.classTemplateHistory.instanceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">Recorded Actions:</span>
                    <span className="text-[#DCE8F5]">{templatesData.templates.classTemplateHistory.recordedMoves} moves</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">Latest Position:</span>
                    <span className="text-[#DCE8F5]">Cell {templatesData.templates.classTemplateHistory.lastMovePosition}</span>
                  </div>
                </div>
              </div>

              {/* Function Template clampScore */}
              <div className="surface-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-[#91B7CE]">
                  <Cpu className="w-4 h-4" />
                  <span>Function Template: clampScore&lt;ScoreT&gt;</span>
                </div>
                <code className="block bg-[#080D16] p-3 rounded-lg text-xs font-mono text-[#DCE8F5] border border-[#293748]">
                  {templatesData.templates.functionTemplateScoring.declaration}
                </code>
                <p className="text-xs text-[#8795A7] leading-relaxed">
                  {templatesData.templates.functionTemplateScoring.explanation}
                </p>
                <div className="bg-[#111B2A] p-3 rounded-lg border border-[#293748] space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">clampScore&lt;int&gt;(1500, -1000, 1000):</span>
                    <span className="text-[#DCE8F5] font-bold">{templatesData.templates.functionTemplateScoring.intResult}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">clampScore&lt;double&gt;(-12.5, -5.0, 5.0):</span>
                    <span className="text-[#DCE8F5] font-bold">{templatesData.templates.functionTemplateScoring.doubleResult}</span>
                  </div>
                </div>
              </div>

              {/* Template Specialization */}
              <div className="surface-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-[#F16D78]">
                  <Sparkles className="w-4 h-4" />
                  <span>Template Specialization: Grid&lt;std::string, 9&gt;</span>
                </div>
                <code className="block bg-[#080D16] p-3 rounded-lg text-xs font-mono text-[#DCE8F5] border border-[#293748]">
                  {templatesData.templates.templateSpecialization.declaration}
                </code>
                <p className="text-xs text-[#8795A7] leading-relaxed">
                  {templatesData.templates.templateSpecialization.explanation}
                </p>
                <div className="bg-[#111B2A] p-3 rounded-lg border border-[#293748] space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">Specialized API:</span>
                    <span className="text-[#F16D78]">{templatesData.templates.templateSpecialization.specializedMethod}</span>
                  </div>
                  <div className="text-[11px] text-[#91B7CE] bg-[#080D16] p-2 rounded overflow-x-auto">
                    {templatesData.templates.templateSpecialization.joinedSample}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="surface-card rounded-2xl p-8 text-center text-xs font-mono text-[#8795A7]">
              Loading template demonstration...
            </div>
          )}
        </div>
      )}

      {/* 3. POLYMORPHISM SECTION */}
      {activeSection === 'polymorphism' && (
        <div className="space-y-6">
          <div className="surface-card rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-serif font-bold text-[#DCE8F5]">
              Virtual Dispatch: Runtime Polymorphism Across 3 Bot Subtypes
            </h3>
            <p className="text-xs text-[#8795A7] leading-relaxed">
              All bot classes inherit from the pure abstract class <code className="text-[#D99A4E]">Player</code>. The call <code className="text-[#D99A4E]">player-&gt;getMove(board)</code> is dispatched polymorphically via C++ vtables at runtime.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <input
                type="text"
                maxLength={9}
                value={polyBoard}
                onChange={(e) => setPolyBoard(e.target.value.toUpperCase())}
                placeholder="X.O......"
                className="px-3 py-2 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] font-mono text-xs uppercase"
              />
              <button
                onClick={() => runPolymorphismDemo(polyBoard, polyMark)}
                disabled={polyLoading}
                className="btn-amber-primary px-4 py-2 rounded-lg text-xs font-mono cursor-pointer flex items-center space-x-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Compare Polymorphic Decisions</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {polyResults.map((r, idx) => (
              <div key={idx} className="surface-card rounded-2xl p-5 space-y-3 border-t-4 border-t-[#D99A4E]">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-[#DCE8F5]">{r.className}</span>
                  <span className="text-[10px] font-mono text-[#8795A7] uppercase">{r.difficulty}</span>
                </div>
                <div className="text-[11px] font-mono text-[#91B7CE]">
                  Base: <span className="text-[#DCE8F5]">{r.parentClass}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#080D16] border border-[#293748] space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">Chosen Cell:</span>
                    <span className="text-[#D99A4E] font-bold">Cell {r.chosenMove}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8795A7]">Dispatch Latency:</span>
                    <span className="text-[#32C997]">{r.executionTimeMs.toFixed(3)} ms</span>
                  </div>
                  {r.explanation.nodesEvaluated !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[#8795A7]">States Evaluated:</span>
                      <span className="text-[#DCE8F5]">{r.explanation.nodesEvaluated}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[#8795A7] leading-relaxed">
                  {r.explanation.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ENCAPSULATION & INVARIANTS SECTION */}
      {activeSection === 'encapsulation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="surface-card rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-serif font-bold text-[#DCE8F5]">
                Encapsulation Attack Vectors
              </h3>
              <p className="text-xs text-[#8795A7] leading-relaxed">
                Test how C++ private access modifiers and custom exceptions prevent invalid state corruption.
              </p>

              <div className="space-y-2">
                {[
                  { id: 'occupied_cell', label: '1. Occupied Cell Write', desc: 'Attempt to place a mark over an existing token.' },
                  { id: 'out_of_bounds', label: '2. Out-of-Bounds Index', desc: 'Attempt to access cell position outside [0..8].' },
                  { id: 'post_game_move', label: '3. Move on Concluded Game', desc: 'Attempt to append a move after terminal outcome.' },
                  { id: 'valid_move', label: '4. Valid Invariant Move', desc: 'Legitimate move obeying domain contracts.' },
                ].map((act) => (
                  <button
                    key={act.id}
                    onClick={() => {
                      setEncapAction(act.id);
                      runEncapsulationDemo(act.id, encapBoard, encapPos, 'O');
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                      encapAction === act.id
                        ? 'bg-[#172231] border-[#D99A4E] text-[#DCE8F5]'
                        : 'bg-[#080D16] border-[#293748] text-[#8795A7] hover:text-[#DCE8F5]'
                    }`}
                  >
                    <div className="font-bold">{act.label}</div>
                    <div className="text-[10px] text-[#8795A7] mt-0.5">{act.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {encapResult ? (
                <div className="surface-card rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#8795A7]">C++ Exception Handler Result</span>
                    {encapResult.success ? (
                      <span className="inline-flex items-center space-x-1 text-xs font-mono text-[#32C997]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Move Accepted</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs font-mono text-[#F16D78]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Domain Invariant Protected</span>
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-[#080D16] border border-[#293748] space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#8795A7]">Action Tested:</span>
                      <span className="text-[#D99A4E]">{encapResult.action}</span>
                    </div>
                    {encapResult.exceptionClass && (
                      <div className="flex justify-between">
                        <span className="text-[#8795A7]">Exception Thrown:</span>
                        <span className="text-[#F16D78] font-bold">{encapResult.exceptionClass}</span>
                      </div>
                    )}
                    {encapResult.errorMessage && (
                      <div className="flex justify-between">
                        <span className="text-[#8795A7]">Exception Message:</span>
                        <span className="text-[#DCE8F5]">{encapResult.errorMessage}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#8795A7]">State Protected:</span>
                      <span className="text-[#32C997] font-bold">TRUE (Private m_grid Intact)</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#8795A7] leading-relaxed">
                    {encapResult.explanation || encapResult.message}
                  </p>
                </div>
              ) : (
                <div className="surface-card rounded-2xl p-8 text-center text-xs font-mono text-[#8795A7]">
                  Loading encapsulation data...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. CLASS REGISTRY ARCHITECTURE SECTION */}
      {activeSection === 'architecture' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="surface-card rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-serif font-bold text-[#DCE8F5]">
              C++ Domain Classes ({classes.length})
            </h3>
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {classes.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedClass(c)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                    selectedClass?.name === c.name
                      ? 'bg-[#172231] text-[#DCE8F5] border border-[#D99A4E]'
                      : 'text-[#8795A7] hover:bg-[#111B2A] hover:text-[#DCE8F5]'
                  }`}
                >
                  <span>{c.name}</span>
                  {c.isTemplate && (
                    <span className="text-[10px] text-[#D99A4E] px-1.5 py-0.5 rounded bg-[#D99A4E]/10">Template</span>
                  )}
                  {c.isAbstract && (
                    <span className="text-[10px] text-[#91B7CE] px-1.5 py-0.5 rounded bg-[#91B7CE]/10">Abstract</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedClass ? (
              <div className="surface-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#293748] pb-4">
                  <div>
                    <h4 className="text-lg font-serif font-bold text-[#DCE8F5]">
                      {selectedClass.name}
                    </h4>
                    <span className="text-xs font-mono text-[#8795A7]">{selectedClass.module}</span>
                  </div>
                  {selectedClass.baseClasses.length > 0 && (
                    <span className="text-xs font-mono text-[#D99A4E]">
                      inherits {selectedClass.baseClasses.join(', ')}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono text-[#8795A7] block uppercase">Public Methods & Operators</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedClass.methods.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#080D16] border border-[#293748] text-xs font-mono text-[#DCE8F5]">
                        {m}()
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 6. UNIT TEST SUITE SECTION */}
      {activeSection === 'tests' && (
        <div className="surface-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#293748] pb-4">
            <div>
              <h3 className="text-base font-serif font-bold text-[#DCE8F5]">
                C++ Native Test Engine Verification (34 Unit Tests)
              </h3>
              <p className="text-xs text-[#8795A7]">
                Tests execute compiled binary <code className="text-[#D99A4E]">./backend/cpp/test_engine</code>.
              </p>
            </div>
            <button
              onClick={handleRunTests}
              disabled={testLoading}
              className="btn-amber-primary px-4 py-2 rounded-lg text-xs font-mono cursor-pointer flex items-center space-x-2"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{testLoading ? 'Executing...' : 'Run All Tests'}</span>
            </button>
          </div>

          <div className="bg-[#080D16] rounded-xl p-4 border border-[#293748] font-mono text-xs text-[#32C997] overflow-x-auto max-h-96 overflow-y-auto">
            {testOutput ? (
              <pre className="whitespace-pre-wrap">{testOutput}</pre>
            ) : (
              <div className="text-[#8795A7] py-6 text-center">
                Click "Run All Tests" to execute the 34 unit tests.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
