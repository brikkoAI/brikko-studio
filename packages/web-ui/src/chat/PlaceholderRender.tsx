// Stub — full implementation in Task 22.
export interface Props {
  text: string;
  hallucinated: Array<{ placeholder: string }>;
}

export function PlaceholderRender({ text }: Props): JSX.Element {
  return <span>{text}</span>;
}
