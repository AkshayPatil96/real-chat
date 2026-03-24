import { useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Paperclip,
  Image,
  Video,
  FileText,
  File as FileIcon,
  Sheet,
} from 'lucide-react';
import type { FileUploadType } from '@/hooks/useFileUpload';

interface FileUploadDropdownProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  allowedTypes?: FileUploadType[];
}

interface UploadOption {
  id: FileUploadType;
  label: string;
  icon: React.ReactNode;
  accept: string;
  disabled: boolean;
  description: string;
}

/**
 * FileUploadDropdown Component
 * Dropdown menu for selecting different file upload types
 * Currently only images are enabled, other types coming soon
 */
export function FileUploadDropdown({
  onFileSelect,
  disabled,
  allowedTypes = ['image'],
}: FileUploadDropdownProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadOptions: UploadOption[] = [
    {
      id: 'image',
      label: 'Photo',
      icon: <Image className="h-4 w-4" />,
      accept: 'image/*',
      disabled: !allowedTypes.includes('image'),
      description: 'JPG, PNG, WebP, GIF (Max 25MB)',
    },
    {
      id: 'video',
      label: 'Video',
      icon: <Video className="h-4 w-4" />,
      accept: 'video/*',
      disabled: true, // Coming soon
      description: 'MP4, WebM (Coming soon)',
    },
    {
      id: 'pdf',
      label: 'PDF',
      icon: <FileText className="h-4 w-4" />,
      accept: '.pdf',
      disabled: true, // Coming soon
      description: 'PDF files (Coming soon)',
    },
    {
      id: 'document',
      label: 'Document',
      icon: <FileIcon className="h-4 w-4" />,
      accept: '.doc,.docx,.txt',
      disabled: true, // Coming soon
      description: 'Word, Text (Coming soon)',
    },
    {
      id: 'spreadsheet',
      label: 'Spreadsheet',
      icon: <Sheet className="h-4 w-4" />,
      accept: '.xls,.xlsx',
      disabled: true, // Coming soon
      description: 'Excel files (Coming soon)',
    },
  ];

  const handleOptionClick = (option: UploadOption) => {
    if (option.disabled) return;

    // Set the accept attribute on the file input
    if (fileInputRef.current) {
      fileInputRef.current.accept = option.accept;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
        aria-label="Upload file"
      />

      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={disabled} type="button">
            <Paperclip className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {uploadOptions.map((option, index) => (
            <div key={option.id}>
              <DropdownMenuItem
                disabled={option.disabled}
                onClick={() => handleOptionClick(option)}
                className="cursor-pointer"
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="shrink-0 mt-0.5">{option.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {option.description}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
              {index === 0 && <DropdownMenuSeparator />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
