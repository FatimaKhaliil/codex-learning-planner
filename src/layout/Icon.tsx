// Unmodified SVG exports from Figma Design. Native dimensions are preserved.
const assets = {
  notebook: ['32-37923', 20], grid: ['32-37995', 20], gridActive: ['32-38097', 20],
  notebookMuted: ['32-38100', 20], calendar: ['32-38001', 20], calendarSidebar: ['32-37932', 20],
  gridSidebar: ['32-37926', 20], user: ['32-37968', 20], logout: ['32-37935', 16],
  plus: ['32-37941', 20], search: ['32-37938', 16], searchMobile: ['32-37974', 20],
  check: ['32-37944', 20], save: ['32-38322', 20], more: ['32-37950', 20],
  downOpen: ['32-37947', 12], downProgress: ['32-37953', 12], downDone: ['32-37959', 12],
  back: ['32-38313', 16], edit: ['32-38373', 16], trash: ['32-38376', 16], trashLarge: ['32-38382', 20],
} as const
export type IconName = keyof typeof assets
export function Icon({ name }: { name: IconName }) {
  const [file, size] = assets[name]
  return <img className="figma-icon" src={`/assets/figma/${file}.svg`} width={size} height={size} alt="" aria-hidden="true" />
}
