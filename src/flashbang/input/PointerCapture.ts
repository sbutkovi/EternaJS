import {DisplayObject, InteractionEvent} from 'pixi.js';
import {Assert, Flashbang, GameObject} from 'flashbang';
import GraphicsObject from 'flashbang/objects/GraphicsObject';

/**
 * Begins capturing pointer input. All pointer events not related to the passed Container will be
 * routed to the given callback function before they reach their intended target. The callback
 * can call {@link PIXI.InteractionEvent.stopPropagation} to prevent the event from
 * being processed further.
 *
 * Capture begins when this object is added as the child of another GameObject via GameObject#addObject,
 * and ends when it is removed via GameObject#removeObject
 *
 * Be aware that with the current implementation, we do intercept non-pointer events, but they
 * will never be propagated (though you should most likely be using pointer events anyways to
 * make sure it works on touchscreens, mice, etc!). However, non-pointer events will still be fired
 * on the original objects if stopPropagation is not called.
 *
 * Note that all events captured are actually events registered on a surface added to the very top
 * of the current mode - they do NOT represent an event fired on an arbitrary Container outside
 * the bounds of the passed Container. This is the only way we can intercept events from PIXI.
 */
export default class PointerCapture extends GameObject {
    constructor(root: DisplayObject, onEvent: (e: InteractionEvent) => void) {
        super();
        this._root = root;
        this._onEvent = onEvent;
        this._surface = new GraphicsObject();
        this._surface.display.alpha = 0;
    }

    protected added() {
        Assert.assertIsDefined(this.mode);
        Assert.assertIsDefined(this.mode.container);
        this.regs.add(this.mode.resized.connect(() => this.onModeResized()));
        this.onModeResized();

        this.addObject(this._surface, this.mode.container);

        // We're not listening to over, out, or upOutside since a) those would refer to our surface,
        // which isn't really meaningful, plus they're not providing the opportunity to prevent
        // any events on lower objects - eg if you stop propagation on a pointerup, PIXI won't then
        // continue to test children objects for a pointerUpOutside or pointerTap (pointerTap is
        // still provided here for the convenience of wanting to know when the surface is tapped)
        this.regs.add(this._surface.pointerDown.connect((e) => this.handleEvent(e)));
        this.regs.add(this._surface.pointerMove.connect((e) => this.handleEvent(e)));
        this.regs.add(this._surface.pointerUp.connect((e) => this.handleEvent(e)));
        this.regs.add(this._surface.pointerCancel.connect((e) => this.handleEvent(e)));
        this.regs.add(this._surface.pointerTap.connect((e) => this.handleEvent(e)));
    }

    public onModeResized() {
        Assert.assertIsDefined(this.mode);
        Assert.assertIsDefined(this.mode.container);
        this._surface.display.clear()
            .beginFill(0x0)
            .drawRect(0, 0, this.mode.container.width, this.mode.container.height)
            .endFill();
    }

    private handleEvent(e: InteractionEvent) {
        Assert.assertIsDefined(Flashbang.app.pixi);
        Assert.assertIsDefined(this.mode?.container);
        const interaction = Flashbang.app.pixi.renderer.plugins.interaction;

        this._surface.display.interactive = false;

        let hitObj: DisplayObject | null = interaction.hitTest(e.data.global);
        let isRootEvent = false;

        while (hitObj != null) {
            if (hitObj === this._root) {
                isRootEvent = true;
                break;
            }
            hitObj = hitObj.parent;
        }

        if (!isRootEvent) {
            this._onEvent(e);
        }

        // Let event continue propagating to siblings
        //
        // Some very rough inspiration from https://github.com/pixijs/pixi.js/issues/2921#issuecomment-493801249
        // Here be dragons, given that we're using internal portions of PIXI/turning off typechecking
        // Hopefully https://github.com/pixijs/pixi.js/issues/6926 will be addressed so that we no longer
        // need to do this.
        //
        // This should happen whether or not the event is related to the root object:
        // - If it is, we need to rerun the processing so that the appropriate events are fired on
        //   the right child of the root object.
        // - If it isn't, processing should only stop if stopPropagation was called - PIXI's pointer
        //   event processing automatically handles that for us.

        /* eslint-disable @typescript-eslint/ban-ts-comment */

        // @ts-ignore Not null
        e.target = null;

        let func;
        switch (e.type) {
            case 'pointerdown':
                // @ts-ignore Private
                func = interaction.processPointerDown;
                break;
            case 'pointermove':
                // @ts-ignore Private
                func = interaction.processPointerMove;
                break;
            case 'pointerup':
                // @ts-ignore Private
                func = interaction.processPointerUp;
                break;
            case 'pointercancel':
                // @ts-ignore Private
                func = interaction.processPointerCancel;
                break;
            default:
                break;
        }

        // Pixi's legacy interaction manager is a bit batty. We need to immediately stop dispatching events
        // so that a pointermove on our surface doesn't cause Pixi to dispatch a pointerout event on
        // the root element of our pointer capture (since the mouse has moved from the root element to
        // the surface since we toggled it off and on again). However, we can't just run processInteractive
        // with the surface off, let it fire its events, then stop the dispatches on the event because
        // we do want _actual_ pointerout events to still be fired, and they wind up getting fired after
        // the processInteractive finishes (next frame, I guess?). This is in part due to the fact
        // the InteractionManager uses static variables to handle the current active event. Regardless,
        // this is an ugly hack and we should move to Pixi's new interaction system which can avoid most of the
        // hacks in this function
        // EDIT: ...well, only if it's a pointermove. Because otherwise a pointertap will fall through past
        // the PointerCapture when it shouldn't
        let newEvent = e;
        if (e.type === 'pointermove') {
            newEvent = new InteractionEvent();
            interaction.configureInteractionEventForDOMEvent(newEvent, e.data.originalEvent, e.data);
        }

        if (func != null) interaction.processInteractive(newEvent, interaction.lastObjectRendered, func, true);

        e.stopPropagationHint = true;

        /* eslint-enable @typescript-eslint/ban-ts-comment */

        this._surface.display.interactive = true;
    }

    private _root: DisplayObject;
    private _surface: GraphicsObject;
    private _onEvent: ((e: InteractionEvent) => void);
}
