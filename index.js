const escpos = require("escpos");
escpos.USB = require("./escpos-usb");

const device = new escpos.USB(0x4b43, 0x3830);
const printer = new escpos.Printer(device);

// create a express server
const express = require("express");
const app = express();
const port = 3001;

app.use(express.json());

// accept requests from any origin and allow specific headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

app.options("/print", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.send();
});

app.post("/print", (req, res) => {
  const { order, orderItems } = req.body;
  device.open(async function (error) {
    if (error) {
      console.error("Open error:", error);
      return;
    }
    // Template looks like this
    //
    // -----------------------------------
    //    Jeevanadhar Generic Medicals
    //       GSTIN:36AAVFJ2067P1ZH
    //   RIMS General Hospital, Adilabad
    //        16/01/2025 02:13PM
    // -----------------------------------
    // Duzine-10 Tab               4.60
    // Qty: 2                      9.20
    // discount                    0.90
    // amount                     10.30
    // Batch(Exp.)     LTA-4560B(09/26)
    // -----                        ------
    // Bandy Plus Tab             30.78
    // Qty: 2                     61.56
    // discount                    6.61
    // amount                     68.95
    // Batch(Exp.)      ABA6X071(01/27)
    // -----                        ------
    // Momegoid-F Cream          185.00
    // Qty: 1                    185.00
    // discount                   17.80
    // amount                    207.20
    // Batch(Exp.)      XE23IB06(06/26)
    // -----------------------------------
    // Items: 3
    // Total: 338.56
    // You saved: 25.31
    // -----------------------------------
    // Goods once sold cannot be taken back.
    // E.&O.E.Subject to Adilabad Jurisdiction
    // -----------------------------------
    //    Ayudha Foundation, Adilabad
    //     Donate blood, save life
    // -----------------------------------
    //
    //

    // Print the header
    printer
      .size(0.55, 0.55)
      .flush()
      .feed()
      .font("a")
      .align("ct")
      .style("bu")
      .text("Jeevanadhar Generic Medicals")
      .text("GSTIN:36AAVFJ2067P1ZH")
      .text("RIMS General Hospital, Adilabad")
      .text(order.dateTime)
      .drawLine()
      .feed();
    for (const item of orderItems) {
      printer
        .size(0.5, 0.5)
        .flush()
        .font("b")
        .style("normal")
        .tableCustom([
          { text: item.name, align: "LEFT", width: 0.5 },
          { text: item.price.toString(), align: "RIGHT", width: 0.5 },
        ])
        .tableCustom([
          { text: `Qty: ${item.quantity}`, align: "LEFT", width: 0.5 },
          {
            text: (item.price * item.quantity).toString(),
            align: "RIGHT",
            width: 0.5,
          },
        ])
        .tableCustom([
          { text: "discount", align: "LEFT", width: 0.5 },
          { text: item.discount.toString(), align: "RIGHT", width: 0.5 },
        ])
        .tableCustom([
          { text: "amount", align: "LEFT", width: 0.5 },
          { text: item.totalPrice.toString(), align: "RIGHT", width: 0.5 },
        ])
        .text(`Batch(Exp.) ${item.batchNumber}(${item.expiryDate})`)
        .tableCustom([
          { text: "Batch(Exp.)", align: "LEFT", width: 0.5 },
          {
            text: `${item.batchNumber}(${item.expiryDate})`,
            align: "RIGHT",
            width: 0.5,
          },
        ])
        .lineSpace()
        .feed();
    }
    printer
      .size(0.5, 0.5)
      .flush()
      .drawLine()
      .text(`Items: ${orderItems.length}`)
      .text(`Total: ${order.totalAmount}`)
      .text(`You saved: ${order.totalSaved}`)
      .text(`Paid by: ${order.paymentMode}`)
      .drawLine()
      .text("Goods once sold cannot be taken back.")
      .text("E.&O.E.Subject to Adilabad Jurisdiction")
      .drawLine()
      .text("Ayudha Foundation, Adilabad")
      .text("Donate blood, save life")
      .drawLine()
      .feed()
      .cut()
      .beep(1, 10)
      .close(function (error) {
        if (error) {
          console.error("Close error:", error);
        }
        res.status(204).send();
      });
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
