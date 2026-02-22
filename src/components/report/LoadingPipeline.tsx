'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingPipelineProps {
  steps: {
    name: string;
    status: 'pending' | 'loading' | 'complete';
  }[];
}

export default function LoadingPipeline({ steps }: LoadingPipelineProps) {
  return (
    <div className="space-y-4 p-6">
      {steps.map((step, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3"
        >
          {step.status === 'loading' && (
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          )}
          {step.status === 'complete' && (
            <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
          {step.status === 'pending' && (
            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
          )}
          <span
            className={
              step.status === 'complete'
                ? 'text-muted-foreground line-through'
                : step.status === 'loading'
                ? 'font-medium'
                : 'text-muted-foreground'
            }
          >
            {step.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
