import {
  type DduItem,
  type ItemHighlight,
} from "jsr:@shougo/ddu-vim@~6.1.0/types";
import {
  BaseColumn,
  type GetTextResult,
} from "jsr:@shougo/ddu-vim@~6.1.0/column";

import type { Denops } from "jsr:@denops/std@~7.1.0";
import { basename } from "jsr:@std/path@~1.0.3/basename";
import * as fn from "jsr:@denops/std@~7.1.1/function";

type Params = {
  collapsedIcon: string;
  expandedIcon: string;
  iconWidth: number;
  indentationWidth: number;
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
  parent?: string;
};

export class Column extends BaseColumn<Params> {
  override async getLength(args: {
    denops: Denops;
    columnParams: Params;
    items: DduItem[];
  }): Promise<number> {
    const widths = await Promise.all(args.items.map(
      async (item) => {
        const baseText = await this.getBaseText({
          denops: args.denops,
          columnParams: args.columnParams,
          item,
        });

        const length = item.__level + 1 + (await fn.strwidth(
          args.denops,
          args.columnParams.iconWidth + baseText,
        ) as number);

        return length;
      },
    )) as number[];
    return Math.max(...widths);
  }

  override async getBaseText(args: {
    denops: Denops;
    columnParams: Params;
    item: DduItem;
  }): Promise<string> {
    const action = args.item?.action as ActionData;
    const isDirectory = args.item.isTree ?? false;
    let path = basename(action.path ?? args.item.word) +
      (isDirectory ? "/" : "");
    const isLink = action.isLink ?? false;

    if (args.item.__groupedPath) {
      path = `${args.item.__groupedPath}${path}`;
    }
    if (isLink && action.path) {
      let realPath = "?";
      try {
        realPath = await Deno.realPath(action.path);
      } catch (_e: unknown) {
        // Ignore link error
      }
      path += ` -> ${realPath}`;
    }

    return path;
  }

  override async getText(args: {
    denops: Denops;
    columnParams: Params;
    startCol: number;
    endCol: number;
    item: DduItem;
    baseText?: string;
  }): Promise<GetTextResult> {
    const params = args.columnParams;
    const action = args.item?.action as ActionData;
    const highlights: ItemHighlight[] = [];
    const isDirectory = args.item.isTree ?? false;
    const isLink = action.isLink ?? false;

    if (isDirectory) {
      const userHighlights = params.highlights;
      highlights.push({
        name: "column-filename-directory-icon",
        hl_group: userHighlights.directoryIcon ?? "Special",
        col: args.startCol + args.item.__level,
        width: params.iconWidth,
      });

      if (args.baseText) {
        highlights.push({
          name: "column-filename-directory-name",
          hl_group: userHighlights.directoryName ?? "Directory",
          col: args.startCol + args.item.__level + params.iconWidth + 1,
          width: args.baseText.length,
        });
      }
    } else if (isLink) {
      const userHighlights = params.highlights;
      highlights.push({
        name: "column-filename-link-icon",
        hl_group: userHighlights.linkIcon ?? "Comment",
        col: args.startCol + args.item.__level,
        width: params.iconWidth,
      });

      if (args.baseText) {
        highlights.push({
          name: "column-filename-link-name",
          hl_group: userHighlights.linkName ?? "Comment",
          col: args.startCol + args.item.__level + params.iconWidth + 1,
          width: args.baseText.length,
        });
      }
    }

    const directoryIcon = args.item.__expanded
      ? params.expandedIcon
      : params.collapsedIcon;
    const icon = isDirectory ? directoryIcon : isLink ? params.linkIcon : " ";

    const text =
      " ".repeat(Math.max(params.indentationWidth * args.item.__level, 0)) +
      icon + " " + args.baseText;
    const width = await fn.strwidth(args.denops, text) as number;
    const padding = " ".repeat(
      Math.max(args.endCol - args.startCol - width, 0),
    );

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
      indentationWidth: 1,
      linkIcon: "@",
      highlights: {},
    };
  }
}
