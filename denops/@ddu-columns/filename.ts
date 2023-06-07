import {
  BaseColumn,
  DduItem,
  ItemHighlight,
} from "https://deno.land/x/ddu_vim@v3.0.0/types.ts";
import { GetTextResult } from "https://deno.land/x/ddu_vim@v3.0.0/base/column.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v3.0.0/deps.ts";
import { basename } from "https://deno.land/std@0.190.0/path/mod.ts";

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
  override async getLength(args: {
    denops: Denops;
    columnParams: Params;
    items: DduItem[];
  }): Promise<number> {
    const widths = await Promise.all(args.items.map(
      async (item) => {
        const action = item?.action as ActionData;
        const isLink = action.isLink ?? false;
        const isDirectory = item.isTree ?? false;
        let path = basename(action.path ?? item.word) +
          (isDirectory ? "/" : "");

        if (isLink && action.path) {
          path += ` -> ${await Deno.realPath(action.path)}`;
        }

        const length = item.__level + 1 + (await fn.strwidth(
          args.denops,
          args.columnParams.iconWidth + path,
        ) as number);

        return length;
      },
    )) as number[];
    return Math.max(...widths);
  }

  override async getText(args: {
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
    let path = basename(action.path ?? args.item.word) +
      (isDirectory ? "/" : "");

    if (isLink && action.path) {
      path += ` -> ${await Deno.realPath(action.path)}`;
    }

    if (isDirectory) {
      const userHighlights = args.columnParams.highlights;
      highlights.push({
        name: "column-filename-directory-icon",
        hl_group: userHighlights.directoryIcon ?? "Special",
        col: args.startCol + args.item.__level,
        width: args.columnParams.iconWidth,
      });

      highlights.push({
        name: "column-filename-directory-name",
        hl_group: userHighlights.directoryName ?? "Directory",
        col: args.startCol + args.item.__level + args.columnParams.iconWidth +
          1,
        width: path.length,
      });
    } else if (isLink) {
      const userHighlights = args.columnParams.highlights;
      highlights.push({
        name: "column-filename-link-icon",
        hl_group: userHighlights.linkIcon ?? "Comment",
        col: args.startCol + args.item.__level,
        width: args.columnParams.iconWidth,
      });

      highlights.push({
        name: "column-filename-link-name",
        hl_group: userHighlights.linkName ?? "Comment",
        col: args.startCol + args.item.__level + args.columnParams.iconWidth +
          1,
        width: path.length,
      });
    }

    const directoryIcon = args.item.__expanded || args.item.isExpanded
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

  override params(): Params {
    return {
      collapsedIcon: "+",
      expandedIcon: "-",
      iconWidth: 1,
      linkIcon: "@",
      highlights: {},
    };
  }
}
