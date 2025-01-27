import {
    Sprite, Texture, Container
} from 'pixi.js';
import {StyledTextBuilder, TextureUtil} from 'flashbang';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface MaxMutationConstraintStatus extends BaseConstraintStatus {
    mutations: number;
}

export default class MaximumMutationConstraint extends Constraint<MaxMutationConstraintStatus> {
    public static readonly NAME = 'MUTATION';
    public readonly maxMutations: number;

    constructor(maxMutations: number) {
        super();
        this.maxMutations = maxMutations;
    }

    public evaluate(context: ConstraintContext): MaxMutationConstraintStatus {
        if (!context.puzzle) throw new Error('Mutation constraint requires beginning sequence, which is unavailable');

        const mutations: number = EPars.sequenceDiff(
            context.puzzle.getSubsequenceWithoutBarcode(context.undoBlocks[0].sequence),
            context.puzzle.getSubsequenceWithoutBarcode(context.puzzle.getBeginningSequence())
        );

        return {
            satisfied: mutations <= this.maxMutations,
            mutations
        };
    }

    public getConstraintBoxConfig(status: MaxMutationConstraintStatus): ConstraintBoxConfig {
        const statText = new StyledTextBuilder()
            .append(status.mutations.toString(), {fill: (status.satisfied ? 0x00aa00 : 0xaa0000)})
            .append(`/${this.maxMutations}`);

        const tooltip = ConstraintBox.createTextStyle().append(`You can only mutate up to ${this.maxMutations} bases`);

        return {
            satisfied: status.satisfied,
            tooltip,
            drawBG: true,
            icon: MaximumMutationConstraint._icon,
            showOutline: true,
            statText,
            clarificationText: `AT MOST${this.maxMutations.toString().length > 2 ? ' \n' : ' '}${this.maxMutations} CHANGES`
        };
    }

    public serialize(): [string, string] {
        return [
            MaximumMutationConstraint.NAME,
            this.maxMutations.toString()
        ];
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const base1 = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseAMid));
        base1.position.set(28, 8);
        icon.addChild(base1);

        const base2 = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseGMid));
        base2.position.set(36, 8);
        icon.addChild(base2);

        const base3 = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseUMid));
        base3.position.set(44, 8);
        icon.addChild(base3);

        const base4 = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseCMid));
        base4.position.set(52, 8);
        icon.addChild(base4);

        return TextureUtil.renderToTexture(icon);
    }
}
