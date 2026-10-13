import { useState } from "react"

function BusinessAvatar({ business, className = "h-10 w-10", imageClassName = "rounded-xl" }) {
  const [failedUrl, setFailedUrl] = useState(null)
  const imageUrl = business.logoUrl
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-yellow-400/10 font-semibold text-yellow-400 ${className}`}>
      {imageUrl && failedUrl !== imageUrl ? (
        <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(imageUrl)} className={`h-full w-full object-cover ${imageClassName}`} />
      ) : String(business.name || "Business").trim().charAt(0).toUpperCase()}
    </span>
  )
}

export default BusinessAvatar
