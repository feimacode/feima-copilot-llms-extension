export type FeimaIconsId =
  | "feima-logo";

export type FeimaIconsKey =
  | "FeimaLogo";

export enum FeimaIcons {
  FeimaLogo = "feima-logo",
}

export const FEIMA_ICONS_CODEPOINTS: { [key in FeimaIcons]: string } = {
  [FeimaIcons.FeimaLogo]: "61697",
};
