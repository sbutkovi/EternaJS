import * as _ from "lodash";
import {Point} from "pixi.js";
import {Enableable} from "../../flashbang/objects/Enableable";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {GameButton} from "./GameButton";
import {GamePanel, GamePanelType} from "./GamePanel";

export enum EternaMenuStyle {
    DEFAULT = 0, PULLUP
}

export class EternaMenu extends GamePanel implements Enableable {
    public constructor(menu_style: EternaMenuStyle = EternaMenuStyle.DEFAULT) {
        super();
        this._style = menu_style;
    }

    protected added() {
        super.added();
        this.needsLayout();
    }

    public addItem(label: string, url: string): void {
        let menuButton: GameButton = new GameButton();

        if (url != null && url.length > 0) {
            menuButton.label(`<A HREF="${url}"><U>${label}</U></A>`, 12);
            menuButton.clicked.connect(() => {
                window.open(url, "_self");
            });
        } else {
            menuButton.label(label, 12);
        }

        this.createMenu(menuButton);
        this.needsLayout();
    }

    public addMenuButton(menuButton: GameButton): number {
        let existingIdx = _.findIndex(this._menus, (menu): boolean => menu.menuButton === menuButton);
        if (existingIdx >= 0) {
            return existingIdx;
        }

        this.createMenu(menuButton);
        this.needsLayout();
        return this._menus.length - 1;
    }

    public addSubMenuButton(menuIdx: number, itemButton: GameButton, at_top: boolean = false): void {
        let menu: Menu = this._menus[menuIdx];
        if (menu.itemButtons.indexOf(itemButton) >= 0) {
            return;
        }

        menu.panel.addObject(itemButton, menu.panel.container);
        if (at_top) {
            menu.itemButtons.unshift(itemButton);
        } else {
            menu.itemButtons.push(itemButton);
        }

        // clicking a submenu item hides the panel
        itemButton.clicked.connect(() => menu.panel.display.visible = false);

        this.needsLayout();
    }

    public addSubMenuButtonAt(menuIdx: number, itemButton: GameButton, pos: number): void {
        let menu: Menu = this._menus[menuIdx];
        if (menu.itemButtons.indexOf(itemButton) >= 0) {
            return;
        }

        menu.panel.addObject(itemButton, menu.panel.container);
        menu.itemButtons.splice(pos, 0, itemButton);

        // clicking a submenu item hides the panel
        itemButton.clicked.connect(() => menu.panel.display.visible = false);

        this.needsLayout();
    }

    public removeButton(itemButton: GameButton): void {
        for (let menu of this._menus) {
            let idx = menu.itemButtons.indexOf(itemButton);
            if (idx >= 0) {
                itemButton.destroySelf();
                menu.itemButtons.splice(idx, 1);
                this.needsLayout();
                return;
            }
        }
    }

    public getWidth(use_margin: boolean = true): number {
        return this._menuWidth + (use_margin ? this._rightMargin : 0);
    }

    public get width(): number {
        return this.getWidth();
    }

    public get height(): number {
        return this._menuHeight;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        this._enabled = value;
        for (let menu of this._menus) {
            menu.menuButton.enabled = value;
            if (!value) {
                menu.panel.display.visible = false;
            }
        }
    }

    private createMenu(menuButton: GameButton): Menu {
        let menu: Menu = new Menu();
        menu.menuButton = menuButton;
        this.addObject(menuButton, this.container);
        this._menus.push(menu);

        menu.panel = new GamePanel(0, 0.85);
        if (this._style === EternaMenuStyle.PULLUP) {
            menu.panel.setup(GamePanelType.NORMAL, 1.0, 0x152843, 1.0, 0xffffff);
        }
        menu.panel.display.visible = false;
        menuButton.addObject(menu.panel, menuButton.container);

        menuButton.pointerOver.connect(() => {
            if (this._enabled) {
                menu.panel.display.visible = true
            }
        });
        menuButton.pointerOut.connect(() => {
            if (this._enabled) {
                menu.panel.display.visible = false
            }
        });

        return menu;
    }

    private needsLayout() {
        if (this.isLiveObject) {
            this.doLayout();
        }
    }

    private doLayout(): void {
        for (let menu of this._menus) {
            if (menu.itemButtons.length === 0) {
                menu.panel.setSize(0, 0);
                continue;
            }

            let height_walker: number = 7;
            let width_walker: number = 0;

            for (let button of menu.itemButtons) {
                if (button == null) {
                    continue;
                }

                button.display.position = new Point(7, height_walker);
                height_walker += DisplayUtil.height(button.display) + 7;
                width_walker = Math.max(width_walker, DisplayUtil.width(button.display) + 14);
            }

            menu.panel.setSize(width_walker, height_walker);
        }

        let space: number = (this._style === EternaMenuStyle.PULLUP ? 1 : 10);
        let width_offset: number = space;
        this._menuHeight = 0;

        for (let menu of this._menus) {
            let buttonWidth: number = menu.menuButton.container.width;
            let buttonHeight: number = menu.menuButton.container.height;

            menu.menuButton.display.position = new Point(width_offset, 0);
            if (this._style === EternaMenuStyle.DEFAULT) {
                menu.panel.display.position = new Point(0, buttonHeight - 1);
            } else if (this._style === EternaMenuStyle.PULLUP) {
                menu.panel.display.position = new Point(0, -menu.panel.height - 1);
            }
            width_offset += buttonWidth + space;
            this._menuHeight = Math.max(this._menuHeight, buttonHeight);
        }

        let lastIdx = this._menus.length - 1;
        let lastButtonWidth = this._menus[lastIdx].menuButton.container.width;
        this._menuWidth = (width_offset + space);
        this._rightMargin = Math.max(lastButtonWidth, this._menus[lastIdx].panel.width) - lastButtonWidth;

        this.setSize(width_offset, this._menuHeight + 1);
    }

    private readonly _style: EternaMenuStyle;

    private _enabled: boolean = true;
    private _menus: Menu[] = [];
    private _menuWidth: number = 0;
    private _rightMargin: number = 0;
    private _menuHeight: number = 0;
}

class Menu {
    public menuButton: GameButton;
    public panel: GamePanel;
    public itemButtons: GameButton[] = [];
}
