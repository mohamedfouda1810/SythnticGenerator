import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import AnimatedButton from '../ui/AnimatedButton';
import { getSupportedFields } from '../../services/api';

const rowVariants = {
  initial: { opacity: 0, x: -40, height: 0 },
  animate: { opacity: 1, x: 0, height: 'auto', transition: { type: 'spring', stiffness: 300, damping: 25 } },
  exit:    { opacity: 0, x: 40, height: 0, transition: { duration: 0.25 } },
};

export default function SchemaBuilder({ schema, onChange }) {
  const [supportedFields, setSupportedFields] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    getSupportedFields().then(({ data }) => {
      if (data?.fields) setSupportedFields(data.fields);
    });
  }, []);

  const addField = () => {
    const newName = `field_${Object.keys(schema).length + 1}`;
    onChange({ ...schema, [newName]: { type: 'name', options: {} } });
  };

  const removeField = (key) => {
    const next = { ...schema };
    delete next[key];
    onChange(next);
  };

  const updateFieldName = (oldKey, newKey) => {
    if (newKey === oldKey || !newKey.trim()) return;
    const entries = Object.entries(schema).map(([k, v]) =>
      k === oldKey ? [newKey.trim(), v] : [k, v]
    );
    onChange(Object.fromEntries(entries));
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

  const entries = Object.entries(schema);

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {entries.map(([key, spec], idx) => (
          <motion.div
            key={key}
            variants={rowVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
            className="flex items-start gap-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl p-4"
          >
            {/* Grip */}
            <div className="pt-2.5 text-[var(--text-tertiary)] cursor-grab">
              <GripVertical size={16} />
            </div>

            {/* Field name */}
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Column Name</label>
              <input
                type="text"
                value={key}
                onChange={(e) => updateFieldName(key, e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors font-mono"
              />
            </div>

            {/* Field type dropdown */}
            <div className="flex-1 min-w-0 relative">
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Field Type</label>
              <button
                onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
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
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-between"
                      >
                        <span className="font-mono text-[var(--text-primary)]">{f.type}</span>
                        <span className="text-xs text-[var(--text-tertiary)]">{f.description}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Options (for category type) */}
            {spec.type === 'category' && (
              <div className="flex-1 min-w-0">
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Choices (comma-separated)</label>
                <input
                  type="text"
                  value={(spec.options?.choices || []).join(', ')}
                  onChange={(e) => updateFieldOption(key, 'choices', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="A, B, C"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors font-mono"
                />
              </div>
            )}

            {/* Delete */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => removeField(key)}
              className="mt-6 p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 transition-colors"
            >
              <Trash2 size={16} />
            </motion.button>
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
