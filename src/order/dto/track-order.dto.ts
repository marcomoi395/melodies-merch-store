import { IsEmail, IsOptional, IsString, ValidateBy, MaxLength, MinLength } from 'class-validator';

export function trackSqlInjectionDemoEnabled(): boolean {
    return (
        process.env.NODE_ENV === 'development' && process.env.TRACK_SQL_INJECTION_DEMO === 'true'
    );
}

export class TrackOrderDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @ValidateBy(
        {
            name: 'trackingPhone',
            validator: {
                validate: (value: unknown) =>
                    typeof value === 'string' &&
                    (trackSqlInjectionDemoEnabled() || /^(?=.*\d)[0-9+().\s-]+$/.test(value)),
            },
        },
        {
            message: 'Phone must contain digits and phone characters',
        },
    )
    @MinLength(7)
    @MaxLength(20)
    phone?: string;
}
