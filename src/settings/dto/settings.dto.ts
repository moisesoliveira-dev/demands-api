import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateCompanyDto {
    @IsOptional() @IsString() @MaxLength(120)
    company_name?: string;

    @IsOptional() @IsString()
    company_logo_url?: string;

    @IsOptional() @IsString() @MaxLength(2000)
    company_context?: string;
}
