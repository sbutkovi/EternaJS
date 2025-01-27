import {ContainerObject} from 'flashbang';
import {Value, ValueView} from 'signals';
import {Sprite} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import BitmapManager from 'eterna/resources/BitmapManager';
import {PLAYER_MARKER_LAYER} from 'eterna/pose2D/Pose2D';
import GameDropdown from './GameDropdown';

export default class MarkerSwitcher extends ContainerObject {
    public readonly selectedLayer: ValueView<string> = new Value(PLAYER_MARKER_LAYER);

    protected added() {
        this.display.addChild(new Sprite(BitmapManager.getBitmap(Bitmaps.ImgRing)));
        this.addDropdown([PLAYER_MARKER_LAYER], PLAYER_MARKER_LAYER);
    }

    protected addDropdown(options: string[], selectedOption: string) {
        if (this._dropdown) {
            this.removeObject(this._dropdown);
        }

        this._dropdown = new GameDropdown({
            fontSize: 14,
            options,
            defaultOption: selectedOption,
            borderWidth: 0,
            dropShadow: true
        });
        this._dropdown.display.position.x = 26;
        this.addObject(this._dropdown, this.container);
        this.regs?.add(this._dropdown.selectedOption.connectNotify((val) => { this.selectedLayer.value = val; }));
    }

    public addMarkerLayer(layer: string, resetSelectedLayer: boolean = true) {
        if (this._dropdown.options.includes(layer)) {
            // It's already there, don't bother recreating the dropdown
            return;
        }

        const newOptions = this._dropdown
            ? [...this._dropdown.options, layer]
            : [PLAYER_MARKER_LAYER, layer];

        this.addDropdown(newOptions, resetSelectedLayer ? layer : this.selectedLayer.value);
    }

    private _dropdown: GameDropdown;
}
