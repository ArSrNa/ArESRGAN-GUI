import { atom } from "jotai";
import type { ImageInput } from "./types";

export const filesState = atom<ImageInput[]>([]);
export const modelsState = atom<{ label: string; value: string }[]>([]);
