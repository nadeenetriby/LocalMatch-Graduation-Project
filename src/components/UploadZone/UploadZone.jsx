import { useRef, useState } from 'react';
import { UploadIcon, CloseIcon } from '../icons';
import { cn } from '../../utils/classNames';
import styles from './UploadZone.module.css';

const INPUT_ID = 'upload-zone-file-input';

export default function UploadZone({ onFileSelect, preview, onClear }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      onFileSelect?.(file);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFilePicker();
    }
  };

  if (preview) {
    return (
      <div className={styles.filled}>
        <div className={styles.previewWrap}>
          <img src={preview} alt="Upload preview" className={styles.previewImage} />
          <button
            type="button"
            className={styles.removeButton}
            onClick={onClear}
            aria-label="Remove image"
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <span className={styles.readyLabel}>Image ready</span>
      </div>
    );
  }

  return (
    <div
      className={cn(styles.zone, isDragOver && styles.dragOver)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Upload fashion image"
    >
      <input
        ref={inputRef}
        id={INPUT_ID}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleImageUpload}
      />
      <UploadIcon size={32} />
      <p className={styles.headline}>
        {isDragOver ? 'Drop here!' : 'Drop an image here'}
      </p>
      <p className={styles.sub}>
        or click to browse — PNG, JPG up to 10MB
      </p>
    </div>
  );
}
