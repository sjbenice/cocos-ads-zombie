export class GameState {
    static State = {
        SPLASH: -1,
        FIRST: 0,
        SECOND: 1,
        THIRD: 2,
        END: 3,
    };

    protected static _state: number = GameState.State.FIRST;
    protected static _isChanged:boolean = false;

    public static setState(state:number) {
        if (GameState._state != state) {
            GameState._state = state;
            GameState._isChanged = true;
        }
    }

    public static getState(): number {
        return GameState._state;
    }

    public static isChanged() : boolean {
        const ret = GameState._isChanged;
        GameState._isChanged = false;
        return ret;
    }

    public static isEnd() : boolean {
        return GameState._state == GameState.State.END;
    }
}


