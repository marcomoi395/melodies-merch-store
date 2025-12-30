import {
    Controller,
    Get,
    Req,
    UseGuards,
    Body,
    Post,
    Param,
    Patch,
    Delete,
    ParseUUIDPipe,
    ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { IJwtPayload } from 'src/auth/auth.interface';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async getCart(@Req() req: Request & { user: IJwtPayload }) {
        const result = await this.cartService.getCart(req.user.sub);

        return {
            statusCode: 200,
            message: 'Cart fetched successfully',
            data: result,
        };
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async addToCart(@Req() req: Request & { user: IJwtPayload }, @Body() body: AddToCartDto) {
        const result = await this.cartService.addItemToCart(req.user.sub, body);

        return {
            statusCode: 201,
            message: 'Item added to cart successfully',
            data: result,
        };
    }

    @Patch(':cartItemId')
    @UseGuards(AuthGuard('jwt'))
    async updateCartItemQuantity(
        @Req() req: Request & { user: IJwtPayload },
        @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
        @Body('quantity', ParseIntPipe) quantity: number,
    ) {
        const result = await this.cartService.updateCartItemQuantity(
            req.user.sub,
            cartItemId,
            quantity,
        );

        return {
            statusCode: 200,
            message: 'Cart item quantity updated successfully',
            data: result,
        };
    }

    @Delete(':cartItemId')
    @UseGuards(AuthGuard('jwt'))
    async removeCartItem(
        @Req() req: Request & { user: IJwtPayload },
        @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
    ) {
        await this.cartService.removeCartItem(req.user.sub, cartItemId);

        return {
            statusCode: 200,
            message: 'Cart item removed successfully',
        };
    }
}
