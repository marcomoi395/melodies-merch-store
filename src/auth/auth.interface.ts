export interface IRegisterUser {
    email: string;
    password: string;
    fullName?: string;
}

export interface IJwtPayload {
    sub: string;
    email: string;
    jti: string;
    iat?: number;
    exp?: number;
}
