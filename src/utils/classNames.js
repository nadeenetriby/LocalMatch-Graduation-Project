/** Simple utility to conditionally join classNames */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
