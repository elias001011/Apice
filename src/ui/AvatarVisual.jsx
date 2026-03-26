import { useState } from 'react'

export function AvatarVisual({ appearance }) {
  const [imageBroken, setImageBroken] = useState(false)

  if (appearance?.mode === 'image' && appearance?.imageUrl && !imageBroken) {
    return (
      <img
        className="avatar-media"
        src={appearance.imageUrl}
        alt=""
        onError={() => setImageBroken(true)}
      />
    )
  }

  return (
    <span className="avatar-initials" aria-hidden="true">
      {appearance?.initials || '?'}
    </span>
  )
}
