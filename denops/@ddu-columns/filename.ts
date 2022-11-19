import {
  BaseColumn,
  DduItem,
  ItemHighlight,
} from "https://deno.land/x/ddu_vim@v.1.13.0/types.ts";
import { GetTextResult } from "https://deno.land/x/ddu_vim@v.1.13.0/base/column.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v.1.13.0/deps.ts";
import { basename } from "https://deno.land/std@0.165.0/path/mod.ts";

type Params = {
  collapsedIcon: string;
  expandedIcon: string;
  iconWidth: number;
  linkIcon: string;
  highlights: HighlightGroup;
};

type HighlightGroup = {
  directoryIcon?: string;
  directoryName?: string;
  linkIcon?: string;
  linkName?: string;
};

type ActionData = {
  isDirectory?: boolean;
  isLink?: boolean;
  path?: string;
};

export class Column extends BaseColumn<Params> {
  async getLength(args: {
    denops: Denops;
    columnParams: Params;
    items: DduItem[];
  }): Promise<number> {
    const widths = await Promise.all(args.items.map(
      async (item) =>
        item.__level + 1 +
        (await fn.strwidth(
          args.denops,
          args.columnParams.iconWidth + (item.display ?? item.word),
        ) as number),
    )) as number[];
    return Math.max(...widths);
  }

  async getText(args: {
    denops: Denops;
    columnParams: Params;
    startCol: number;
    endCol: number;
    item: DduItem;
  }): Promise<GetTextResult> {
    const action = args.item?.action as ActionData;
    const highlights: ItemHighlight[] = [];
    const isDirectory = args.item.isTree ?? false;
    const isLink = action.isLink ?? false;
    const path = basename(action.path ?? args.item.word) +
      (isDirectory ? "/" : "");

    if (isDirectory) {
      const userHighlights = args.columnParams.highlights;
      highlights.push({
        name: "column-filename-directory-icon",
        "hl_group": userHighlights.directoryIcon ?? "Special",
        col: args.startCol + args.item.__level,
        width: args.columnParams.iconWidth,
      });

      highlights.push({
        name: "column-filename-directory-name",
        "hl_group": userHighlights.directoryName ?? "Directory",
        col: args.startCol + args.item.__level +
          args.columnParams.iconWidth + 1,
        width: path.length,
      });
    } else if (isLink) {
      const userHighlights = args.columnParams.highlights;
      highlights.push({
        name: "column-filename-link-icon",
        "hl_group": userHighlights.linkIcon ?? "Comment",
        col: args.startCol + args.item.__level,
        width: args.columnParams.iconWidth,
      });

      highlights.push({
        name: "column-filename-link-name",
        "hl_group": userHighlights.linkName ?? "Comment",
        col: args.startCol + args.item.__level +
          args.columnParams.iconWidth + 1,
        width: path.length,
      });
    }

    const directoryIcon = args.item.__expanded
      ? args.columnParams.expandedIcon
      : args.columnParams.collapsedIcon;
    const icon = isDirectory
      ? directoryIcon
      : isLink
      ? args.columnParams.linkIcon
      : " ";
    const text = " ".repeat(args.item.__level) + icon + " " + path;
    const width = await fn.strwidth(args.denops, text) as number;
    const padding = " ".repeat(args.endCol - args.startCol - width);

    return Promise.resolve({
      text: text + padding,
      highlights: highlights,
    });
  }

  params(): Params {
    return {
      collapsedIcon: "+",
      expandedIcon: "-",
      iconWidth: 1,
      linkIcon: "@",
      highlights: {},
    };
  }
}
