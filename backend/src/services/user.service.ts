import { userRepository } from '../repositories/user.repository';
import { senderRepository } from '../repositories/sender.repository';
import { AppError } from '../utils/appError';

export class UserService {
  async getUserProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async getDevOrCreateUser(email: string = 'dev.user@example.com', name: string = 'Developer User') {
    let user = await userRepository.findByEmail(email);
    if (!user) {
      user = await userRepository.upsertGoogleUser({
        googleId: 'dev_google_id_12345',
        email,
        name,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Developer'
      });
    }

    await senderRepository.ensureDefaultSender(user.id, user.email, user.name);
    return userRepository.findById(user.id);
  }
}

export const userService = new UserService();
