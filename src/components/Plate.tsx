import { photo } from '../lib/format';

interface Props {
  file: string;
  alt: string;
  size?: 'sm' | 'lg';
  className?: string;
  imgClassName?: string;
  shadow?: boolean;
  eager?: boolean;
}

/** صورة طبق شفافة + ظل ناعم تحتها */
export function Plate({ file, alt, size = 'sm', className = '', imgClassName = '', shadow = true, eager }: Props) {
  return (
    <div className={`relative ${className}`}>
      {shadow && <div className="plate-shadow" aria-hidden />}
      <img
        src={photo(file, size)}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className={`relative h-full w-full object-contain select-none ${imgClassName}`}
      />
    </div>
  );
}
