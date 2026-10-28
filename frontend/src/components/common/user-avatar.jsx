import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { useCloudConfig } from '@/providers/CloudConfigProvider';
import { cn } from '@/lib/utils';

function userName(user) {
  return user?.Nombre ?? user?.nombre ?? user?.CorreoElectronico ?? user?.correoElectronico ?? 'Usuario';
}

function initialsFor(user) {
  return userName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('');
}

export function UserAvatar({ user, className, fallbackClassName, imageClassName, iconClassName }) {
  const { getCloudAssetUrl } = useCloudConfig();
  const imagePath = user?.ImgPerfil ?? user?.imgPerfil ?? '';
  const imageUrl = getCloudAssetUrl(imagePath);
  const initials = initialsFor(user);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [imageUrl]);

  return (
    <span className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)} title={userName(user)}>
      {imageUrl && !imageFailed ? (
        <img src={imageUrl} alt={userName(user)} onError={() => setImageFailed(true)} className={cn('size-full object-cover', imageClassName)} />
      ) : (
        <span className={cn('flex size-full items-center justify-center font-bold', fallbackClassName)}>
          {initials || <User className={cn('size-4', iconClassName)} />}
        </span>
      )}
    </span>
  );
}
