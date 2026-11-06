import { useEffect, useRef, useState } from "react";
/** Decorative footage only: never a live camera or a model inference result. */
export default function MotionVideo({
  name,
  paused = false,
  hero = false,
  className = "",
}) {
  const ref = useRef();
  const [visible, setVisible] = useState(hero);
  const [activated, setActivated] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: hero ? "0px" : "120px", threshold: 0 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hero]);
  useEffect(() => {
    if (visible && !paused) setActivated(true);
  }, [visible, paused]);
  useEffect(() => {
    const video = ref.current;
    const update = () => {
      if (visible && !paused && !document.hidden) {
        video.play().catch(() => {});
      } else video.pause();
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      video.pause();
    };
  }, [visible, paused, activated]);
  return (
    <video
      ref={ref}
      className={`motion-video ${className}`}
      src={activated ? `/media/${name}.mp4` : undefined}
      poster={`/media/${name}.jpg`}
      muted
      loop
      playsInline
      preload={hero ? "metadata" : "none"}
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
