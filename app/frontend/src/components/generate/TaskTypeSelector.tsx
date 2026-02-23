import {
  Music,
  Disc3,
  Paintbrush,
  Split,
  Puzzle,
  StepForward,
} from 'lucide-react'
import { TabsRoot, TabsList, TabsTrigger } from '../ui/Tabs'
import { useGenerationStore } from '../../stores/useGenerationStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { TASK_TYPES } from '../../lib/constants'
import ReferenceAudioUpload from './ReferenceAudioUpload'
import TrackSelector from './TrackSelector'
import type { ReactNode } from 'react'

const ICON_MAP: Record<string, ReactNode> = {
  music: <Music className="w-4 h-4" />,
  'disc-3': <Disc3 className="w-4 h-4" />,
  paintbrush: <Paintbrush className="w-4 h-4" />,
  split: <Split className="w-4 h-4" />,
  puzzle: <Puzzle className="w-4 h-4" />,
  'step-forward': <StepForward className="w-4 h-4" />,
}

export default function TaskTypeSelector() {
  const taskType = useGenerationStore((s) => s.form.task_type)
  const updateForm = useGenerationStore((s) => s.updateForm)
  const modelStatus = useSettingsStore((s) => s.modelStatus)

  const currentModel = modelStatus?.current_model
  const isTurbo = currentModel?.type === 'turbo'

  // Filter tasks based on model capabilities
  const availableTasks = TASK_TYPES.filter(
    (task) => !isTurbo || task.turboSupported,
  )

  const currentTask = TASK_TYPES.find((t) => t.id === taskType)
  const requiresReference = currentTask?.requiresReference ?? false
  const showTrackSelector = taskType === 'extract' || taskType === 'lego'

  return (
    <div className="flex flex-col gap-3">
      <TabsRoot
        value={taskType}
        onValueChange={(value) => updateForm({ task_type: value })}
      >
        <TabsList className="flex flex-wrap">
          {availableTasks.map((task) => (
            <TabsTrigger key={task.id} value={task.id} className="gap-1.5">
              {ICON_MAP[task.icon]}
              <span>{task.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </TabsRoot>

      {currentTask && (
        <p className="text-xs text-[var(--text-muted)] px-1">
          {currentTask.description}
        </p>
      )}

      {requiresReference && <ReferenceAudioUpload />}
      {showTrackSelector && <TrackSelector />}
    </div>
  )
}
