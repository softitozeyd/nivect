# Landing page media

The user supplied five MP4 clips and explicitly requested removal of the former
3D hero, authorizing watermark cleanup in a follow-up message. Four PET clips were
selected. The metal-cap glass-bottle clip is outside the PET product scope and is
not included. Original uploads remain outside the repository.

| App asset           | Supplied source                        | Placement                                |
| ------------------- | -------------------------------------- | ---------------------------------------- |
| production-line.mp4 | istockphoto-1362942697-640_adpp_is.mp4 | Hero: actual bottle conveyor             |
| single-bottle.mp4   | video_preview_h264 (1).mp4             | Product explanation: isolated PET bottle |
| cap-detail.mp4      | video_preview_h264 (2).mp4             | Visual-inspection card: cap detail       |
| bottles-flow.mp4    | istockphoto-863092914-640_adpp_is.mp4  | Closing production statement             |

Outputs are silent H.264/yuv420p MP4 files with fast-start metadata. Posters use the
same processed footage. User-authorized cleanup uses masks of the static overlay
regions and inpainting; reconstruction can soften fine detail in those regions.
The files are presentation footage, never training data or evidence of model
performance. Source provenance is retained; no ownership or licensing status is
inferred from an upload or from an edit.

`MotionVideo.jsx` manages viewport/tab visibility, lazy loading and poster fallback.
The landing pause button controls every decorative video. Reduced-motion and
Save-Data users receive paused posters initially; they may explicitly play.
No decorative video is connected to the PC camera or submitted as inspection data.

## README and product tour

`docs/assets/` contains the light/dark SVG wordmarks, cover, technology strip,
actual product screenshots, tour poster, Turkish captions and the narrated-by-text
product tour MP4. The palette follows the current forest/sage/cream controls.
The tour is a real browser recording with an original, locally synthesized ambient
sound bed. No spoken voice or external music service is used.

For this recording only, the browser's test camera receives the existing
`single-bottle.mp4` presentation clip. The video identifies it as recorded footage;
it does not imply physical camera validation or trained-model inference. Three
MANUAL fixtures demonstrate persistence and record management. They are removed
by their exact event IDs after capture. See [product-tour.md](product-tour.md) for
chapters, transcript and the limits of this demonstration.
