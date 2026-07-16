import { IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @MinLength(1, { message: 'Content cannot be empty' })
  @MaxLength(500, { message: 'Content cannot exceed 500 characters' })
  content: string;

  @IsOptional()
  @IsString()
  @IsIn(['public', 'unlisted', 'followers-only', 'direct'], {
    message: 'Visibility must be one of: public, unlisted, followers-only, direct',
  })
  visibility?: string;
}
