import * as log from 'loglevel';
import EPars from 'eterna/EPars';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import Folder from './Folder';

export default class RNAFoldBasic extends Folder {
    public static readonly NAME = 'Basic';

    /** Asynchronously creates a new instance of the RNAFoldBasic folder. */
    public static create(): Promise<RNAFoldBasic> {
        return Promise.resolve(new RNAFoldBasic());
    }

    public get isFunctional(): boolean {
        return true;
    }

    public get name(): string {
        return RNAFoldBasic.NAME;
    }

    public scoreStructures(
        seq: Sequence, pairs: SecStruct, _pseudoknotted: boolean = false,
        _temp: number = 37, _outNodes: number[] | null = null
    ): number {
        let score = 0;

        if (pairs.length !== seq.length) {
            throw new Error("Sequence and pairs lengths don't match");
        }

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs.pairingPartner(ii) > ii) {
                score++;
            }
        }

        return score;
    }

    public foldSequence(
        seq: Sequence, _secondBestPairs: SecStruct | null, _desiredPairs: string | null = null,
        _pseudoknotted: boolean = false, _temp: number = 37
    ): SecStruct {
        const n: number = seq.length;
        const pairs: SecStruct = new SecStruct(new Array(n).fill(-1));
        const dpArray: number[] = new Array(n * n);
        const traceArray: number[] = new Array(n * n);

        for (let ii = 0; ii < n; ii++) {
            for (let jj = 0; jj < n; jj++) {
                const index: number = ii * n + jj;

                if (ii > jj + 1) {
                    dpArray[index] = -1;
                } else if ((ii === jj) || (ii + 1 === jj) || (ii === jj + 1)) {
                    dpArray[index] = 0;
                } else {
                    dpArray[index] = -1;
                }

                traceArray[index] = 0;
            }
        }

        for (let iter = 1; iter < n; iter++) {
            let iiWalker = 0;
            let jjWalker: number = iter;

            while (jjWalker < n) {
                let maxCase = 0;
                let maxVal = -1;
                let currentVal = 0;

                if (iiWalker < n - 1 && jjWalker > 0 && iiWalker < jjWalker - 1) {
                    if (EPars.pairType(seq.nt(iiWalker), seq.nt(jjWalker))) {
                        currentVal = dpArray[(iiWalker + 1) * n + jjWalker - 1] + 1;

                        if (currentVal < 1) {
                            log.warn('Something is wrong with DP case 1', iiWalker, jjWalker);
                        }

                        if (currentVal > maxVal) {
                            maxVal = currentVal;
                            maxCase = 1;
                        }
                    }
                }

                if (jjWalker > 0) {
                    currentVal = dpArray[(iiWalker) * n + jjWalker - 1];

                    if (currentVal < 0) {
                        log.warn('Something is wrong with DP case 3', iiWalker, jjWalker);
                    }

                    if (currentVal > maxVal) {
                        maxVal = currentVal;
                        maxCase = 3;
                    }
                }

                if (iiWalker < n - 1) {
                    currentVal = dpArray[(iiWalker + 1) * n + jjWalker];

                    if (currentVal < 0) {
                        log.warn('Something is wrong with DP case 2', iiWalker, jjWalker);
                    }

                    if (currentVal > maxVal) {
                        maxVal = currentVal;
                        maxCase = 2;
                    }
                }

                if (iiWalker + 1 < jjWalker) {
                    for (let kkWalker: number = iiWalker + 1; kkWalker < jjWalker; kkWalker++) {
                        if (dpArray[iiWalker * n + kkWalker] < 0 || dpArray[kkWalker * n + jjWalker] < 0) {
                            log.warn('Something is wrong with DP case k');
                        }

                        currentVal = dpArray[iiWalker * n + kkWalker] + dpArray[(kkWalker + 1) * n + jjWalker];

                        if (currentVal > maxVal) {
                            maxVal = currentVal;
                            maxCase = -kkWalker;
                        }
                    }
                }

                dpArray[iiWalker * n + jjWalker] = maxVal;
                traceArray[iiWalker * n + jjWalker] = maxCase;

                iiWalker++;
                jjWalker++;
            }
        }

        this.tracePairs(traceArray, pairs, n, 0, n - 1);

        return pairs;
    }

    private tracePairs(traceArray: number[], pairs: SecStruct, n: number, iiStart: number, jjStart: number): void {
        const dir: number = traceArray[iiStart * n + jjStart];

        if (dir === 1) {
            pairs.setPairingPartner(iiStart, jjStart);
            // Unneeded: this function is naturally reciprocal.
            // pairs.setPairingPartner(jjStart, iiStart);

            this.tracePairs(traceArray, pairs, n, iiStart + 1, jjStart - 1);
        } else if (dir === 2) {
            this.tracePairs(traceArray, pairs, n, iiStart + 1, jjStart);
        } else if (dir === 3) {
            this.tracePairs(traceArray, pairs, n, iiStart, jjStart - 1);
        } else if (dir !== 0) {
            const kk: number = -dir;
            this.tracePairs(traceArray, pairs, n, iiStart, kk);
            this.tracePairs(traceArray, pairs, n, kk + 1, jjStart);
        }
    }
}
