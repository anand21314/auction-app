const Listing = require('../models/Listing');
const User = require('../models/User');
const nodemailer = require('nodemailer');

/**
 * Periodically checks for expired auctions, sets them to 'closed',
 * resolves the highest bidder, and sends details exchange emails.
 */
let isRunning = false;

const resolveEndedAuctions = async () => {
  if (isRunning) {
    return;
  }
  isRunning = true;
  try {
    const expiredActiveListings = await Listing.find({
      type: 'auction',
      status: 'active',
      endTime: { $lte: new Date() }
    });

    if (expiredActiveListings.length === 0) {
      return;
    }

    console.log(`⏳ Found ${expiredActiveListings.length} expired active auctions to resolve.`);

    for (const listing of expiredActiveListings) {
      console.log(`⚙️ Resolving expired auction: "${listing.title}" (ID: ${listing._id})`);

      // Mark closed and emailSent immediately to prevent race conditions or duplicate processing
      listing.status = 'closed';
      listing.emailSent = true;

      // Extract highest bid
      const sortedBids = [...listing.bids].sort((a, b) => b.amount - a.amount);
      const winningBid = sortedBids[0];

      if (winningBid) {
        const winnerId = winningBid.bidder;
        listing.winner = winnerId;

        // Fetch user profiles for contact details
        const seller = await User.findById(listing.seller);
        const winner = await User.findById(winnerId);

        if (seller && winner) {
          console.log(`🎉 Auction Ended with Winner: @${winner.username} (Bid: ₹${winningBid.amount})`);

          const emailSubject = `Velocity Marketplace - Auction Completed: ${listing.title}`;
          const sellerPhone = seller.phone || 'Not Provided';
          const winnerPhone = winner.phone || 'Not Provided';

          // Email Content for Winner
          const winnerEmailContent = `
            Dear @${winner.username},

            Congratulations! You have won the auction for "${listing.title}" with a winning bid of ₹${winningBid.amount.toLocaleString('en-IN')}.

            As per the marketplace agreement, here are the Seller's personal details to coordinate checkout, payment, and secure shipment:
            -----------------------------------------
            Seller Name: @${seller.username}
            Email: ${seller.email}
            Phone Number: ${sellerPhone}
            -----------------------------------------

            Please reach out to the seller directly to finalize your purchase.

            Thank you for bidding on Velocity Marketplace!
          `.trim();

          // Email Content for Seller
          const sellerEmailContent = `
            Dear @${seller.username},

            Your listing for "${listing.title}" has successfully ended at auction! The winning bid was ₹${winningBid.amount.toLocaleString('en-IN')} placed by @${winner.username}.

            As per the marketplace agreement, here are the Winner's personal details to coordinate checkout, payment, and secure shipment:
            -----------------------------------------
            Winner Name: @${winner.username}
            Email: ${winner.email}
            Phone Number: ${winnerPhone}
            -----------------------------------------

            Please contact the winner directly to finalize the transaction.

            Thank you for selling on Velocity Marketplace!
          `.trim();

          // Elegantly mock log email contents to the terminal in all conditions
          console.log("\n======================================================================");
          console.log(`📧 SYSTEM DISPATCH: TRANSACTION COMPLETED INVOICE`);
          console.log(`📍 TARGET RECIPIENTS: [Winner: ${winner.email}] & [Seller: ${seller.email}]`);
          console.log("----------------------------------------------------------------------");
          console.log(`>>> OUTGOING MAIL TO WINNER (@${winner.username} / ${winner.email}):`);
          console.log(winnerEmailContent);
          console.log("----------------------------------------------------------------------");
          console.log(`>>> OUTGOING MAIL TO SELLER (@${seller.username} / ${seller.email}):`);
          console.log(sellerEmailContent);
          console.log("======================================================================\n");

          // Dispatch real emails if SMTP environmental keys are provided in .env
          if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PASS
                }
              });

              await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: winner.email,
                subject: emailSubject,
                text: winnerEmailContent
              });

              await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: seller.email,
                subject: emailSubject,
                text: sellerEmailContent
              });

              console.log(`📬 Nodemailer real email alerts successfully sent to: ${winner.email} & ${seller.email}`);
            } catch (mailErr) {
              console.error("⚠️ Nodemailer real mail dispatch pipeline failed:", mailErr.message);
            }
          }
        }
      } else {
        console.log(`ℹ️ Auction ended for "${listing.title}" but no bids were recorded. Listing marked closed.`);
      }

      await listing.save();
    }
  } catch (error) {
    console.error("❌ Exception inside resolveEndedAuctions cron task:", error);
  } finally {
    isRunning = false;
  }
};

module.exports = { resolveEndedAuctions };
