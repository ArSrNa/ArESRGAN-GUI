import { atom } from "recoil";
import type { ImageInput } from "./types";

export const filesState = atom<ImageInput[]>({
  key: "files",
  default: [],
  dangerouslyAllowMutability: true,
});

export const modelsState = atom<{ label: string; value: string }[]>({
  key: "model",
  default: [],
});
