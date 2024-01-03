import {
  BaseColumn,
  DduItem,
  ItemHighlight,
} from "https://deno.land/x/ddu_vim@v3.4.3/types.ts";
import { GetTextResult } from "https://deno.land/x/ddu_vim@v3.4.3/base/column.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v3.4.3/deps.ts";
import { basename } from "https://deno.land/std@0.195.0/path/mod.ts";

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
    const params = args.columnParams;
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
      const userHighlights = params.highlights;
      highlights.push({
        name: "column-filename-directory-icon",
        hl_group: userHighlights.directoryIcon ?? "Special",
        col: args.startCol + args.item.__level,
        width: params.iconWidth,
      });

      highlights.push({
        name: "column-filename-directory-name",
        hl_group: userHighlights.directoryName ?? "Directory",
        col: args.startCol + args.item.__level + params.iconWidth + 1,
        width: path.length,
      });
    } else if (isLink) {
      const userHighlights = params.highlights;
      highlights.push({
        name: "column-filename-link-icon",
        hl_group: userHighlights.linkIcon ?? "Comment",
        col: args.startCol + args.item.__level,
        width: params.iconWidth,
      });

      highlights.push({
        name: "column-filename-link-name",
        hl_group: userHighlights.linkName ?? "Comment",
        col: args.startCol + args.item.__level + params.iconWidth + 1,
        width: path.length,
      });
    }

    const directoryIcon = args.item.__expanded
      ? params.expandedIcon
      : params.collapsedIcon;
    const icon = isDirectory ? directoryIcon : isLink ? params.linkIcon : " ";

    const text =
      " ".repeat(Math.max(params.indentationWidth * args.item.__level, 0)) +
      icon + " " + path;
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
