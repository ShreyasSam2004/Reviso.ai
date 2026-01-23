import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { useTTS } from '../../contexts/TTSContext';

interface SpeakButtonProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
  label?: string;
}

export function SpeakButton({
  text,
  size = 'md',
  variant = 'default',
  className = '',
  label,
}: SpeakButtonProps) {
  const { speak, stop, pause, resume, isSpeaking, isPaused, isSupported, currentText } = useTTS();

  if (!isSupported) {
    return null;
  }

  const isCurrentlyPlaying = isSpeaking && currentText === text;

  const handleClick = () => {
    if (isCurrentlyPlaying) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      speak(text);
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stop();
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variantClasses = {
    default: `bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/60`,
    ghost: `text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700`,
    outline: `border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400`,
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        onClick={handleClick}
        className={`rounded-lg transition-colors ${sizeClasses[size]} ${variantClasses[variant]}`}
        title={isCurrentlyPlaying ? (isPaused ? 'Resume' : 'Pause') : 'Listen'}
      >
        {isCurrentlyPlaying ? (
          isPaused ? (
            <Play className={iconSizes[size]} />
          ) : (
            <Pause className={iconSizes[size]} />
          )
        ) : (
          <Volume2 className={iconSizes[size]} />
        )}
      </button>
      {isCurrentlyPlaying && (
        <button
          onClick={handleStop}
          className={`rounded-lg transition-colors ${sizeClasses[size]} text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30`}
          title="Stop"
        >
          <VolumeX className={iconSizes[size]} />
        </button>
      )}
      {label && (
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{label}</span>
      )}
    </div>
  );
}
