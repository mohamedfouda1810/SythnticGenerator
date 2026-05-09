import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import AnimatedButton from '../ui/AnimatedButton';
import { getSupportedFields } from '../../services/api';

const rowVariants = {
  initial: { opacity: 0, x: -40, height: 0 },
  animate: { opacity: 1, x: 0, height: 'auto', transition: { type: 'spring', stiffness: 300, damping: 25 } },
  exit:    { opacity: 0, x: 40, height: 0, transition: { duration: 0.25 } },
};

// Fields that have editable min/max options
const RANGE_TYPES = new Set(['integer', 'float', 'age', 'salary']);

export default function SchemaBuilder({ schema, onChange }) {
  const [supportedFields, setSupportedFields] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    getSupportedFields().then(({ data }) => {
      if (data?.fields) setSupportedFields(data.fields);
    });
  }, []);

  // Convert object schema to array for editing
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
    // Rebuild object preserving order
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
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {entries.map(([key, spec]) => (
          <motion.div
            key={key}
            variants={rowVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
            className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              {/* Grip */}
              <div className="pt-2.5 text-[var(--text-tertiary)] cursor-grab">
                <GripVertical size={16} />
              </div>

              {/* Field name */}
              <div className="flex-1 min-w-0">
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Column Name</label>
                <input
                  type="text"
                  defaultValue={key}
                  onBlur={(e) => updateFieldName(key, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  className="w-full px-3 py-2 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors font-mono"
                />
              </div>

              {/* Field type dropdown */}
              <div className="flex-1 min-w-0 relative">
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Field Type</label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
                  className="w-full flex items-center justify-between px-3 py-2 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
                >
                  <span className="font-mono">{spec.type}</span>
                  <motion.div animate={{ rotate: openDropdown === key ? 180 : 0 }}>
                    <ChevronDown size={14} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openDropdown === key && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -5, height: 0 }}
                      className="absolute z-20 left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl shadow-xl max-h-48 overflow-y-auto"
                    >
                      {supportedFields.map((f) => (
                        <button
                          key={f.type}
                          onClick={() => updateFieldType(key, f.type)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-between ${
                            spec.type === f.type ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : ''
                          }`}
                        >
                          <span className="font-mono text-[var(--text-primary)]">{f.type}</span>
                          <span className="text-xs text-[var(--text-tertiary)]">{f.description}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Delete */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => removeField(key)}
                className="mt-6 p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 transition-colors"
              >
                <Trash2 size={16} />
              </motion.button>
            </div>

            {/* Options for category type */}
            {spec.type === 'category' && (
              <div className="mt-3 pl-9">
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Choices (comma-separated)</label>
                <input
                  type="text"
                  value={(spec.options?.choices || []).join(', ')}
                  onChange={(e) => updateFieldOption(key, 'choices', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="A, B, C"
                  className="w-full px-3 py-2 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors font-mono"
                />
              </div>
            )}

            {/* Options for range types (integer, float, age, salary) */}
            {RANGE_TYPES.has(spec.type) && (
              <div className="mt-3 pl-9 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Min</label>
                  <input
                    type="number"
                    value={spec.options?.min ?? ''}
                    onChange={(e) => updateFieldOption(key, 'min', Number(e.target.value))}
                    className="w-full px-3 py-2 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Max</label>
                  <input
                    type="number"
                    value={spec.options?.max ?? ''}
                    onChange={(e) => updateFieldOption(key, 'max', Number(e.target.value))}
                    className="w-full px-3 py-2 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Field Button */}
      <motion.div className="flex justify-center pt-2">
        <AnimatedButton onClick={addField} variant="secondary" icon={Plus} size="sm">
          Add Field
        </AnimatedButton>
      </motion.div>
    </div>
  );
}
