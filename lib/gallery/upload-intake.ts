import { ALLOWED_IMAGE_MIME } from '@/lib/storage/photo-limits';

const ALLOWED_MIME = new Set<string>(ALLOWED_IMAGE_MIME);

type DragDataItem = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntry | null;
};

type FileSystemEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
};

type FileSystemFileEntry = FileSystemEntry & {
  file: (callback: (file: File) => void, onError?: (error: DOMException) => void) => void;
};

type FileSystemDirectoryEntry = FileSystemEntry & {
  createReader: () => {
    readEntries: (
      callback: (entries: FileSystemEntry[]) => void,
      onError?: (error: DOMException) => void
    ) => void;
  };
};

type IntakeResult = {
  accepted: File[];
  rejectedCount: number;
};

function isAllowedImageFile(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
}

function dedupeFiles(files: File[]): File[] {
  const seen = new Set<string>();
  const unique: File[] = [];
  for (const file of files) {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(file);
  }
  return unique;
}

function fromFileList(files: FileList | null): IntakeResult {
  const all = files ? Array.from(files) : [];
  const accepted = all.filter(isAllowedImageFile);
  return {
    accepted: dedupeFiles(accepted),
    rejectedCount: all.length - accepted.length,
  };
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise((resolve) => {
    entry.file(
      (file) => resolve(file),
      () => resolve(null)
    );
  });
}

function readDirectoryEntries(entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = entry.createReader();
  return new Promise((resolve) => {
    const all: FileSystemEntry[] = [];
    const readNext = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            resolve(all);
            return;
          }
          all.push(...batch);
          readNext();
        },
        () => resolve(all)
      );
    };
    readNext();
  });
}

async function collectEntryFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await readFileEntry(entry as FileSystemFileEntry);
    return file ? [file] : [];
  }
  if (!entry.isDirectory) return [];
  const children = await readDirectoryEntries(entry as FileSystemDirectoryEntry);
  const nested = await Promise.all(children.map((child) => collectEntryFiles(child)));
  return nested.flat();
}

async function fromDataTransferItems(items: DataTransferItemList): Promise<IntakeResult> {
  const fallbackFiles: File[] = [];
  const entryCollectors: Promise<File[]>[] = [];
  let rejectedCount = 0;

  for (const item of Array.from(items)) {
    if (item.kind !== 'file') {
      rejectedCount += 1;
      continue;
    }
    const dragItem = item as DragDataItem;
    const entry = dragItem.webkitGetAsEntry?.() ?? null;
    if (entry) {
      entryCollectors.push(collectEntryFiles(entry));
      continue;
    }
    const file = item.getAsFile();
    if (file) fallbackFiles.push(file);
  }

  const entryFiles = (await Promise.all(entryCollectors)).flat();
  const all = [...fallbackFiles, ...entryFiles];
  const accepted = all.filter(isAllowedImageFile);
  rejectedCount += all.length - accepted.length;
  return {
    accepted: dedupeFiles(accepted),
    rejectedCount,
  };
}

export async function collectDroppedImageFiles(dataTransfer: DataTransfer): Promise<IntakeResult> {
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    return fromDataTransferItems(dataTransfer.items);
  }
  return fromFileList(dataTransfer.files);
}

export function collectPickedImageFiles(files: FileList | null): IntakeResult {
  return fromFileList(files);
}
