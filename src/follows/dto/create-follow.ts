import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateFollowDto {
  @IsString()
  @IsNotEmpty({ message: 'Following handle is required' })
  @Matches(/^[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+$/, {
    message: 'Following must be a valid handle format: username@server',
  })
  following!: string;
}
