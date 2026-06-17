import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronDown, Database, Check, Settings2, Hash, Type } from 'lucide-react';
import { getSupportedFields } from '../../services/api';

const rowVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 }
};

const RANGE_TYPES = new Set(['integer', 'float', 'age', 'salary', 'date', 'datetime']);

export default function SchemaBuilder({ schema, onChange }) {
  const [supportedFields, setSupportedFields] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    getSupportedFields().then(({ data }) => {
      if (data?.fields) setSupportedFields(data.fields);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const entries = Object.entries(schema);

  const addField = () => {
    const idx = entries.length + 1;
    let name = `field_${idx}`;
    while (schema[name]) name = `field_${idx}_${Date.now()}`;
    onChange({ ...schema, [name]: { type: 'name', options: {} } });
  };

  const removeField = (key) => {
    const next = { ...schema };
    delete next[key];
    onChange(next);
  };

  const updateFieldName = (oldKey, newKey) => {
    const trimmed = newKey.trim().replace(/\s+/g, '_');
    if (!trimmed || trimmed === oldKey) return;
    const newSchema = {};
    for (const [k, v] of entries) {
      newSchema[k === oldKey ? trimmed : k] = v;
    }
    onChange(newSchema);
  };

  const updateFieldType = (key, type) => {
    const field = supportedFields.find(f => f.type === type);
    onChange({
      ...schema,
      [key]: {
        type,
        options: field?.options && Object.keys(field.options).length > 0
          ? { ...field.options }
          : {},
      },
    });
    setOpenDropdown(null);
  };

  const updateFieldOption = (key, optKey, value) => {
    onChange({
      ...schema,
      [key]: {
        ...schema[key],
        options: { ...schema[key].options, [optKey]: value },
      },
    });
  };

  return (
    <div className="space-y-4 relative">
      <AnimatePresence mode="popLayout">
        {entries.map(([key, spec], index) => (
          <motion.div
            key={key}
            variants={rowVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
            className="relative"
            style={{ zIndex: openDropdown === key ? 100 : entries.length - index }}
          >
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-5 transition-all duration-300 hover:border-blue-500/30">
              <div className="flex flex-col md:flex-row items-center gap-6">
                
                {/* Drag Handle & Order */}
                <div className="flex items-center gap-4 shrink-0">
                  <GripVertical size={18} className="text-gray-600 cursor-grab active:cursor-grabbing" />
                  <span className="text-xs font-black text-gray-500 font-mono bg-black/30 w-8 h-8 rounded-lg flex items-center justify-center">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Column ID */}
                <div className="flex-1 min-w-[180px] relative w-full">
                  <Database size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                  <input
                    type="text"
                    defaultValue={key}
                    onBlur={(e) => updateFieldName(key, e.target.value)}
                    className="form-input-premium pl-12 h-11 bg-black/20"
                    placeholder="field_name"
                  />
                </div>

                {/* Statistical Type Select */}
                <div className="flex-1 min-w-[200px] relative w-full" ref={openDropdown === key ? dropdownRef : null}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
                    className="w-full h-11 flex items-center justify-between bg-black/20 border border-gray-700/50 rounded-xl px-4 text-xs font-black text-white hover:border-blue-500/50 transition-all uppercase tracking-widest"
                  >
                    <span className="flex items-center gap-2">
                      <Type size={14} className="text-blue-400" />
                      {spec.type}
                    </span>
                    <ChevronDown size={14} className={`text-gray-500 transition-transform ${openDropdown === key ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {openDropdown === key && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 right-0 top-full mt-3 bg-[#0F0F1A] border border-gray-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[999] p-2 overflow-hidden"
                      >
                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                          {supportedFields.map((f) => (
                            <button
                              key={f.type}
                              onClick={() => updateFieldType(key, f.type)}
                              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group mb-1 ${
                                spec.type === f.type ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-gray-400 hover:text-white'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-wider leading-none">{f.type}</div>
                                <div className="text-[9px] mt-1.5 opacity-60 truncate font-medium">{f.description}</div>
                              </div>
                              {spec.type === f.type && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Parameters */}
                <div className="flex-[1.5] min-w-[240px] flex items-center gap-4 bg-black/30 rounded-xl px-5 h-11 border border-gray-700/30 w-full">
                   {(spec.type === 'category' || RANGE_TYPES.has(spec.type)) ? (
                      <>
                         {spec.type === 'category' && (
                            <div className="flex-1 flex items-center gap-3">
                               <Settings2 size={16} className="text-gray-600 shrink-0" />
                               <input
                                  type="text"
                                  value={(spec.options?.choices || []).join(', ')}
                                  onChange={(e) => updateFieldOption(key, 'choices', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                  placeholder="Tokens (e.g. A, B, C)"
                                  className="w-full bg-transparent border-none p-0 text-xs font-bold focus:ring-0 text-gray-300 placeholder:text-gray-600 placeholder:font-normal"
                               />
                            </div>
                         )}
                         {(spec.type === 'date' || spec.type === 'datetime') && (
                            <div className="flex-1 flex items-center gap-6 justify-between">
                               <div className="flex items-center gap-3">
                                  <Settings2 size={16} className="text-gray-600 shrink-0" />
                                  <input
                                     type="text"
                                     value={spec.options?.start ?? ''}
                                     onChange={(e) => updateFieldOption(key, 'start', e.target.value)}
                                     placeholder="Start (YYYY-MM-DD)"
                                     className="w-24 bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 text-blue-400 placeholder:text-gray-600 placeholder:font-normal"
                                  />
                               </div>
                               <div className="w-px h-4 bg-gray-700/50" />
                               <div className="flex items-center gap-3">
                                  <input
                                     type="text"
                                     value={spec.options?.end ?? ''}
                                     onChange={(e) => updateFieldOption(key, 'end', e.target.value)}
                                     placeholder="End (YYYY-MM-DD)"
                                     className="w-24 bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 text-blue-400 placeholder:text-gray-600 placeholder:font-normal"
                                  />
                               </div>
                            </div>
                         )}
                         {RANGE_TYPES.has(spec.type) && spec.type !== 'date' && spec.type !== 'datetime' && (
                            <div className="flex-1 flex items-center gap-6 justify-between">
                               <div className="flex items-center gap-3">
                                  <Hash size={16} className="text-gray-600 shrink-0" />
                                  <input
                                     type="number"
                                     value={spec.options?.min ?? ''}
                                     onChange={(e) => updateFieldOption(key, 'min', Number(e.target.value))}
                                     placeholder="Min"
                                     className="w-16 bg-transparent border-none p-0 text-xs font-black focus:ring-0 text-blue-400 placeholder:text-gray-600 placeholder:font-normal"
                                  />
                               </div>
                               <div className="w-px h-4 bg-gray-700/50" />
                               <div className="flex items-center gap-3">
                                  <input
                                     type="number"
                                     value={spec.options?.max ?? ''}
                                     onChange={(e) => updateFieldOption(key, 'max', Number(e.target.value))}
                                     placeholder="Max"
                                     className="w-16 bg-transparent border-none p-0 text-xs font-black focus:ring-0 text-blue-400 placeholder:text-gray-600 placeholder:font-normal"
                                  />
                               </div>
                            </div>
                         )}
                      </>
                   ) : (
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] w-full text-center">No Parameters Required</span>
                   )}
                </div>

                {/* Delete */}
                <div className="shrink-0">
                   <button
                     onClick={() => removeField(key)}
                     className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 shadow-inner group"
                   >
                     <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                   </button>
                </div>

              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.div layout className="flex justify-center pt-8">
        <button
          onClick={addField}
          className="flex items-center gap-5 px-12 py-5 rounded-2xl bg-gray-800/20 border-2 border-dashed border-gray-700/50 text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/5 transition-all group shadow-2xl"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-lg">
            <Plus size={22} />
          </div>
          Add Logical Field
        </button>
      </motion.div>
    </div>
  );
}
